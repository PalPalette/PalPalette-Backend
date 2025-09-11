import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsObject,
} from "class-validator";

export enum NotificationAction {
  PRESS_POWER_BUTTON = "press_power_button",
  ENTER_PAIRING_CODE = "enter_pairing_code",
  AUTHENTICATION_SUCCESS = "authentication_success",
  AUTHENTICATION_FAILED = "authentication_failed",
  NANOLEAF_PAIRING = "nanoleaf_pairing",
  NANOLEAF_PAIRING_PROGRESS = "nanoleaf_pairing_progress",
  NANOLEAF_PAIRING_SUCCESS = "nanoleaf_pairing_success",
  NANOLEAF_PAIRING_FAILED = "nanoleaf_pairing_failed",
  LIGHTING_AUTHENTICATION_REQUIRED = "lighting_authentication_required",
}

export class UserNotificationDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsEnum(NotificationAction)
  action: NotificationAction;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  pairingCode?: string;

  @IsNumber()
  @IsOptional()
  timeout?: number; // Timeout in seconds (0 = no timeout)

  @IsNumber()
  @IsOptional()
  timestamp?: number; // Unix timestamp

  @IsOptional()
  @IsObject()
  additionalData?: Record<string, any>;
}

export class NotificationResponseDto {
  @IsString()
  @IsNotEmpty()
  notificationId: string;

  @IsString()
  @IsNotEmpty()
  status: "delivered" | "failed" | "pending";

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class LightingAuthenticationProgressDto {
  @IsString()
  deviceId: string;

  @IsEnum(NotificationAction)
  action: NotificationAction;

  @IsString()
  instructions: string;

  @IsNumber()
  remainingTime: number; // Seconds remaining

  @IsNumber()
  @IsOptional()
  timestamp?: number;
}
