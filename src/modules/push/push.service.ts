import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PushSubscription } from "./entities/push-subscription.entity";
import { User } from "../users/entities/user.entity";
import {
  PushNotificationPayload,
  PushSendOptions,
} from "./dto/push-notification-payload.dto";
import * as admin from "firebase-admin";

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private fcmInitialized = false;

  constructor(
    @InjectRepository(PushSubscription)
    private readonly pushSubscriptionRepository: Repository<PushSubscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async onModuleInit() {
    await this.initializeFirebase();
  }

  private async initializeFirebase() {
    try {
      // Check if Firebase is already initialized
      if (admin.apps.length > 0) {
        this.fcmInitialized = true;
        this.logger.log("Firebase Admin already initialized");
        return;
      }

      const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT_JSON;
      const serviceAccountPath = process.env.FCM_SERVICE_ACCOUNT_PATH;

      if (serviceAccountJson) {
        // Initialize from JSON string in environment variable
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.fcmInitialized = true;
        this.logger.log(
          "Firebase Admin initialized from FCM_SERVICE_ACCOUNT_JSON"
        );
      } else if (serviceAccountPath) {
        // Initialize from file path
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
        });
        this.fcmInitialized = true;
        this.logger.log(
          `Firebase Admin initialized from path: ${serviceAccountPath}`
        );
      } else {
        this.logger.warn(
          "FCM not configured: FCM_SERVICE_ACCOUNT_JSON or FCM_SERVICE_ACCOUNT_PATH environment variable not set. Push notifications will be disabled."
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to initialize Firebase Admin: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Register a push token for a user
   */
  async registerToken(
    userId: string,
    token: string,
    platform: string,
    deviceId?: string
  ): Promise<PushSubscription> {
    try {
      // Check if token already exists
      let subscription = await this.pushSubscriptionRepository.findOne({
        where: { token },
        relations: ["user"],
      });

      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (subscription) {
        // Update existing subscription
        subscription.user = user;
        subscription.platform = platform;
        subscription.deviceId = deviceId;
        subscription.enabled = true;
        subscription.lastSeenAt = new Date();
        this.logger.log(
          `Updated existing push subscription for user ${userId}, token: ${token.substring(
            0,
            20
          )}...`
        );
      } else {
        // Create new subscription
        subscription = this.pushSubscriptionRepository.create({
          user,
          token,
          platform,
          deviceId,
          enabled: true,
          lastSeenAt: new Date(),
        });
        this.logger.log(
          `Registered new push subscription for user ${userId}, platform: ${platform}`
        );
      }

      return await this.pushSubscriptionRepository.save(subscription);
    } catch (error) {
      this.logger.error(
        `Failed to register push token: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Unregister a push token
   */
  async unregisterToken(token: string): Promise<boolean> {
    try {
      const subscription = await this.pushSubscriptionRepository.findOne({
        where: { token },
      });

      if (subscription) {
        await this.pushSubscriptionRepository.remove(subscription);
        this.logger.log(
          `Unregistered push token: ${token.substring(0, 20)}...`
        );
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Failed to unregister push token: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Send push notification to a specific user
   */
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload,
    options: PushSendOptions = {}
  ): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
    if (!this.fcmInitialized) {
      this.logger.warn("FCM not initialized, skipping push notification");
      return { success: false, sentCount: 0, failedCount: 0 };
    }

    try {
      // Get user's active subscriptions
      const subscriptions = await this.pushSubscriptionRepository.find({
        where: { user: { id: userId }, enabled: true },
        relations: ["user"],
      });

      if (subscriptions.length === 0) {
        this.logger.debug(`No active push subscriptions for user ${userId}`);
        return { success: true, sentCount: 0, failedCount: 0 };
      }

      // Check user's messaging timeframe if not bypassing
      if (!options.bypassTimeframe) {
        const user = await this.userRepository.findOne({
          where: { id: userId },
        });

        if (user && !this.isWithinMessagingTimeframe(user)) {
          this.logger.debug(
            `User ${userId} is outside messaging timeframe, skipping push`
          );
          return { success: true, sentCount: 0, failedCount: 0 };
        }
      }

      const tokens = subscriptions.map((sub) => sub.token);
      const result = await this.sendToTokens(tokens, payload, options);

      // Clean up invalid tokens
      if (result.invalidTokens.length > 0) {
        await this.removeInvalidTokens(result.invalidTokens);
      }

      return {
        success: result.sentCount > 0,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send push to user ${userId}: ${error.message}`,
        error.stack
      );
      return { success: false, sentCount: 0, failedCount: 1 };
    }
  }

  /**
   * Send push notification to specific tokens
   */
  async sendToTokens(
    tokens: string[],
    payload: PushNotificationPayload,
    options: PushSendOptions = {}
  ): Promise<{
    sentCount: number;
    failedCount: number;
    invalidTokens: string[];
  }> {
    if (!this.fcmInitialized) {
      this.logger.warn("FCM not initialized, skipping push notification");
      return { sentCount: 0, failedCount: tokens.length, invalidTokens: [] };
    }

    if (tokens.length === 0) {
      return { sentCount: 0, failedCount: 0, invalidTokens: [] };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data ? this.serializeData(payload.data) : undefined,
        android: {
          priority: options.priority === "high" ? "high" : "normal",
        },
        apns: {
          headers: {
            "apns-priority": options.priority === "high" ? "10" : "5",
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (
          !resp.success &&
          (resp.error?.code === "messaging/invalid-registration-token" ||
            resp.error?.code === "messaging/registration-token-not-registered")
        ) {
          invalidTokens.push(tokens[idx]);
        }
      });

      this.logger.log(
        `Push notification sent: ${response.successCount} succeeded, ${response.failureCount} failed`
      );

      return {
        sentCount: response.successCount,
        failedCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send push notifications: ${error.message}`,
        error.stack
      );
      return { sentCount: 0, failedCount: tokens.length, invalidTokens: [] };
    }
  }

  /**
   * Get all active subscriptions for a user
   */
  async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    return this.pushSubscriptionRepository.find({
      where: { user: { id: userId }, enabled: true },
      order: { lastSeenAt: "DESC" },
    });
  }

  /**
   * Remove invalid tokens from the database
   */
  private async removeInvalidTokens(tokens: string[]): Promise<void> {
    try {
      for (const token of tokens) {
        await this.pushSubscriptionRepository.delete({ token });
      }
      this.logger.log(`Removed ${tokens.length} invalid push tokens`);
    } catch (error) {
      this.logger.error(
        `Failed to remove invalid tokens: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Serialize data for FCM (all values must be strings)
   */
  private serializeData(data: Record<string, any>): Record<string, string> {
    const serialized: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        serialized[key] =
          typeof value === "string" ? value : JSON.stringify(value);
      }
    }
    return serialized;
  }

  /**
   * Check if current time is within user's messaging timeframe
   */
  private isWithinMessagingTimeframe(user: User): boolean {
    if (!user.messageStartTime || !user.messageEndTime) {
      return true; // No timeframe configured, always allow
    }

    const now = new Date();
    const currentTime = this.parseTimeString(
      now.toTimeString().substring(0, 5)
    );

    const startTime = this.parseTimeString(
      user.messageStartTime.substring(0, 5)
    );
    const endTime = this.parseTimeString(user.messageEndTime.substring(0, 5));

    return currentTime >= startTime && currentTime <= endTime;
  }

  private parseTimeString(timeStr: string): number {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  }
}
