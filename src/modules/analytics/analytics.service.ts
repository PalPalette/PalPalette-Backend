import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { Message } from "../messages/entities/message.entity";
import { User } from "../users/entities/user.entity";
import {
  UserAnalyticsExportDto,
  AggregateAnalyticsExportDto,
  AnonymizedMessageData,
  UserSummary,
  AggregateUserSummary,
  GlobalSummary,
  ExportPeriod,
} from "./dto/analytics-export.dto";
import { AnonymizationUtil } from "./utils/anonymization.util";
import { CsvExportUtil } from "./utils/csv-export.util";

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  /**
   * Export analytics for a specific user
   */
  async exportUserAnalytics(
    userId: string,
    format: "json" | "csv",
    dateFrom?: string,
    dateTo?: string
  ): Promise<UserAnalyticsExportDto | string> {
    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const anonymizer = new AnonymizationUtil();
    const anonymizedUserId = anonymizer.getAnonymizedUserId(userId);

    // Build date filter values
    const dateFromObj = dateFrom ? new Date(dateFrom) : null;
    const dateToObj = dateTo ? new Date(dateTo) : null;

    // Get sent messages
    const sentMessages = await this.messageRepository.find({
      where: { sender: { id: userId }, ...dateFilter },
      relations: ["sender", "recipient", "device"],
      order: { sentAt: "ASC" },
    });

    // Get received messages
    const receivedMessages = await this.messageRepository.find({
      where: { recipient: { id: userId }, ...dateFilter },
      relations: ["sender", "recipient", "device"],
      order: { sentAt: "ASC" },
    });

    // Calculate summary statistics
    const uniqueRecipients = new Set(
      sentMessages.map((m) => m.recipient?.id).filter(Boolean)
    );
    const uniqueSenders = new Set(
      receivedMessages.map((m) => m.sender?.id).filter(Boolean)
    );

    const summary: UserSummary = {
      messages_sent: sentMessages.length,
      messages_received: receivedMessages.length,
      unique_recipients: uniqueRecipients.size,
      unique_senders: uniqueSenders.size,
      total_colors_sent: sentMessages.reduce(
        (sum, m) => sum + (m.colors?.length || 0),
        0
      ),
      total_colors_received: receivedMessages.reduce(
        (sum, m) => sum + (m.colors?.length || 0),
        0
      ),
    };

    // Anonymize and combine messages
    const anonymizedSentMessages = sentMessages.map((msg) => ({
      ...this.anonymizeMessage(msg, anonymizer),
      direction: "sent" as const,
    }));

    const anonymizedReceivedMessages = receivedMessages.map((msg) => ({
      ...this.anonymizeMessage(msg, anonymizer),
      direction: "received" as const,
    }));

    const allMessages = [
      ...anonymizedSentMessages,
      ...anonymizedReceivedMessages,
    ].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const exportData: UserAnalyticsExportDto = {
      export_type: "user_analytics",
      timestamp: new Date().toISOString(),
      user_id: anonymizedUserId,
      period: this.buildPeriod(dateFrom, dateTo),
      summary,
      messages: allMessages,
    };

    if (format === "csv") {
      return CsvExportUtil.userMessagesToCsv(allMessages);
    }

    return exportData;
  }

  /**
   * Export aggregate analytics for all users
   */
  async exportAggregateAnalytics(
    format: "json" | "csv",
    dateFrom?: string,
    dateTo?: string,
    includeMessages: boolean = false
  ): Promise<AggregateAnalyticsExportDto | string> {
    const anonymizer = new AnonymizationUtil();

    // Build date filter values for query builder
    const dateFromObj = dateFrom ? new Date(dateFrom) : null;
    const dateToObj = dateTo ? new Date(dateTo) : null;

    // Get all messages with a lightweight select to avoid heavy joins
    const qb = this.messageRepository
      .createQueryBuilder("message")
      .leftJoin("message.sender", "sender")
      .leftJoin("message.recipient", "recipient")
      .select([
        "message.id",
        "message.sentAt",
        "message.deliveredAt",
        "message.status",
        "message.colors",
        "message.imageUrl",
        "sender.id",
        "recipient.id",
      ])
      .orderBy("message.sentAt", "ASC");

    if (dateFromObj && dateToObj) {
      qb.andWhere("message.sentAt BETWEEN :dateFrom AND :dateTo", {
        dateFrom: dateFromObj,
        dateTo: dateToObj,
      });
    } else if (dateFromObj) {
      qb.andWhere("message.sentAt >= :dateFrom", {
        dateFrom: dateFromObj,
      });
    } else if (dateToObj) {
      qb.andWhere("message.sentAt <= :dateTo", {
        dateTo: dateToObj,
      });
    }

    const allMessages = await qb.getMany();

    // Get all users who sent or received messages
    const userIds = new Set<string>();
    allMessages.forEach((msg) => {
      if (msg.sender?.id) userIds.add(msg.sender.id);
      if (msg.recipient?.id) userIds.add(msg.recipient.id);
    });

    // Calculate per-user statistics
    const userSummaries: AggregateUserSummary[] = Array.from(userIds).map(
      (userId) => {
        const sent = allMessages.filter((m) => m.sender?.id === userId);
        const received = allMessages.filter((m) => m.recipient?.id === userId);
        const uniqueRecipients = new Set(
          sent.map((m) => m.recipient?.id).filter(Boolean)
        );
        const uniqueSenders = new Set(
          received.map((m) => m.sender?.id).filter(Boolean)
        );

        return {
          user_id: anonymizer.getAnonymizedUserId(userId),
          messages_sent: sent.length,
          messages_received: received.length,
          unique_recipients: uniqueRecipients.size,
          unique_senders: uniqueSenders.size,
          total_colors_sent: sent.reduce(
            (sum, m) => sum + (m.colors?.length || 0),
            0
          ),
          total_colors_received: received.reduce(
            (sum, m) => sum + (m.colors?.length || 0),
            0
          ),
        };
      }
    );

    // Calculate global statistics
    const deliveredMessages = allMessages.filter((m) => m.deliveredAt !== null);
    const totalColors = allMessages.reduce(
      (sum, m) => sum + (m.colors?.length || 0),
      0
    );

    const globalSummary: GlobalSummary = {
      total_users: userIds.size,
      total_messages: allMessages.length,
      total_delivered: deliveredMessages.length,
      delivery_rate:
        allMessages.length > 0
          ? deliveredMessages.length / allMessages.length
          : 0,
      average_colors_per_message:
        allMessages.length > 0 ? totalColors / allMessages.length : 0,
      date_range: {
        first_message: allMessages[0]?.sentAt?.toISOString() || null,
        last_message:
          allMessages[allMessages.length - 1]?.sentAt?.toISOString() || null,
      },
    };

    const exportData: AggregateAnalyticsExportDto = {
      export_type: "aggregate_analytics",
      timestamp: new Date().toISOString(),
      period: this.buildPeriod(dateFrom, dateTo),
      global_summary: globalSummary,
      users: userSummaries,
    };

    // Optionally include all messages
    if (includeMessages) {
      exportData.messages = allMessages.map((msg) =>
        this.anonymizeMessage(msg, anonymizer)
      );
    }

    if (format === "csv") {
      // For CSV, always include messages
      const anonymizedMessages = allMessages.map((msg) =>
        this.anonymizeMessage(msg, anonymizer)
      );
      return CsvExportUtil.messagesToCsv(anonymizedMessages);
    }

    return exportData;
  }

  /**
   * Anonymize a message by replacing user IDs
   */
  private anonymizeMessage(
    message: Message,
    anonymizer: AnonymizationUtil
  ): AnonymizedMessageData {
    return {
      message_id: `msg_${message.id.substring(0, 8)}`,
      sender_id: anonymizer.getAnonymizedUserId(message.sender?.id || null),
      recipient_id: anonymizer.getAnonymizedUserId(
        message.recipient?.id || null
      ),
      timestamp: message.sentAt.toISOString(),
      status: message.status,
      delivery_timestamp: message.deliveredAt?.toISOString() || null,
      colors: Array.isArray(message.colors) ? message.colors : [],
      color_count: Array.isArray(message.colors) ? message.colors.length : 0,
      image_url: message.imageUrl || null,
    };
  }

  /**
   * Build date filter for TypeORM query
   */
  private buildDateFilter(
    dateFrom?: string,
    dateTo?: string
  ): { sentAt?: any } | Record<string, never> {
    if (!dateFrom && !dateTo) {
      return {};
    }

    if (dateFrom && dateTo) {
      return {
        sentAt: Between(new Date(dateFrom), new Date(dateTo)),
      };
    }

    if (dateFrom) {
      return {
        sentAt: MoreThanOrEqual(new Date(dateFrom)),
      };
    }

    if (dateTo) {
      return {
        sentAt: LessThanOrEqual(new Date(dateTo)),
      };
    }

    return {};
  }

  /**
   * Build export period object
   */
  private buildPeriod(dateFrom?: string, dateTo?: string): ExportPeriod {
    return {
      start: dateFrom || null,
      end: dateTo || null,
    };
  }
}
