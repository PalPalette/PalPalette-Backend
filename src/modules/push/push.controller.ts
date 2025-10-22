import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { PushService } from "./push.service";
import { RegisterPushTokenDto } from "./dto/register-push-token.dto";
import { UnregisterPushTokenDto } from "./dto/unregister-push-token.dto";
import {
  RegisterPushTokenResponseDto,
  UnregisterPushTokenResponseDto,
  GetSubscriptionsResponseDto,
} from "./dto/push-response.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("Push Notifications")
@Controller("push")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post("register")
  @ApiOperation({
    summary: "Register a push notification token",
    description:
      "Register a FCM token for the authenticated user to receive push notifications. " +
      "If the token already exists, it will be updated with the new platform and device information. " +
      "Users can register multiple tokens for different devices.",
  })
  @ApiResponse({
    status: 201,
    description: "Token registered successfully",
    type: RegisterPushTokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid token or platform - validation failed",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid or missing JWT token",
  })
  async registerToken(
    @Body() registerDto: RegisterPushTokenDto,
    @Request() req
  ): Promise<RegisterPushTokenResponseDto> {
    const subscription = await this.pushService.registerToken(
      req.user.userId,
      registerDto.token,
      registerDto.platform,
      registerDto.deviceId
    );

    return {
      success: true,
      message: "Push token registered successfully",
      subscriptionId: subscription.id,
    };
  }

  @Post("unregister")
  @ApiOperation({
    summary: "Unregister a push notification token",
    description:
      "Remove a FCM token from receiving push notifications. " +
      "This should be called when a user logs out or when the app is uninstalled. " +
      "The token will be permanently removed from the database.",
  })
  @ApiResponse({
    status: 200,
    description: "Token unregistered successfully",
    type: UnregisterPushTokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid or missing JWT token",
  })
  async unregisterToken(
    @Body() unregisterDto: UnregisterPushTokenDto
  ): Promise<UnregisterPushTokenResponseDto> {
    const removed = await this.pushService.unregisterToken(unregisterDto.token);

    return {
      success: removed,
      message: removed
        ? "Push token unregistered successfully"
        : "Token not found",
    };
  }

  @Get("subscriptions")
  @ApiOperation({
    summary: "Get user's active push subscriptions",
    description:
      "Retrieve all active push notification subscriptions for the authenticated user. " +
      "This endpoint returns a list of all registered devices and their platforms. " +
      "Useful for displaying registered devices in user settings or managing notifications.",
  })
  @ApiResponse({
    status: 200,
    description: "Subscriptions retrieved successfully",
    type: GetSubscriptionsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - invalid or missing JWT token",
  })
  async getSubscriptions(@Request() req): Promise<GetSubscriptionsResponseDto> {
    const subscriptions = await this.pushService.getUserSubscriptions(
      req.user.userId
    );

    return {
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        platform: sub.platform,
        deviceId: sub.deviceId,
        createdAt: sub.createdAt,
        lastSeenAt: sub.lastSeenAt,
      })),
    };
  }
}
