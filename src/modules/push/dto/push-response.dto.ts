import { ApiProperty } from "@nestjs/swagger";

export class RegisterPushTokenResponseDto {
  @ApiProperty({
    description: "Operation success status",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "Success message",
    example: "Push token registered successfully",
  })
  message: string;

  @ApiProperty({
    description: "ID of the created subscription",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  subscriptionId: string;
}

export class UnregisterPushTokenResponseDto {
  @ApiProperty({
    description: "Operation success status",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "Result message",
    example: "Push token unregistered successfully",
  })
  message: string;
}

export class PushSubscriptionDto {
  @ApiProperty({
    description: "Subscription ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  id: string;

  @ApiProperty({
    description: "Platform type",
    example: "android",
    enum: ["ios", "android", "web"],
  })
  platform: string;

  @ApiProperty({
    description: "Optional device identifier",
    example: "user-phone-1",
    required: false,
  })
  deviceId?: string;

  @ApiProperty({
    description: "When the subscription was created",
    example: "2025-10-21T12:00:00.000Z",
  })
  createdAt: Date;

  @ApiProperty({
    description: "Last time the subscription was active",
    example: "2025-10-21T14:30:00.000Z",
    required: false,
  })
  lastSeenAt?: Date;
}

export class GetSubscriptionsResponseDto {
  @ApiProperty({
    description: "List of active push subscriptions",
    type: [PushSubscriptionDto],
  })
  subscriptions: PushSubscriptionDto[];
}
