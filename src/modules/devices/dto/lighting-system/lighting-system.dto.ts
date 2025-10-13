export enum LightingStatus {
  UNKNOWN = "unknown",
  WORKING = "working",
  ERROR = "error",
  AUTHENTICATION_REQUIRED = "authentication_required",
}
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsIn,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LightingSystemConfigDto {
  @ApiProperty({
    example: "philips_hue",
    description: "Type of lighting system",
    enum: [
      "nanoleaf",
      "wled",
      "ws2812",
      "philips_hue",
      "neopixel",
      "addressable_led",
      "generic_rgb",
    ],
  })
  @IsString()
  @IsIn([
    "nanoleaf",
    "wled",
    "ws2812",
    "philips_hue",
    "neopixel",
    "addressable_led",
    "generic_rgb",
  ])
  lightingSystemType: string;

  @ApiPropertyOptional({
    example: "192.168.1.100",
    description: "IP address or hostname of the lighting system",
  })
  @IsString()
  @IsOptional()
  lightingHostAddress?: string;

  @ApiPropertyOptional({
    example: 80,
    description: "Port number for the lighting system connection",
  })
  @IsNumber()
  @IsOptional()
  lightingPort?: number;

  @ApiPropertyOptional({
    example: "auth-token-123",
    description: "Authentication token for the lighting system",
  })
  @IsString()
  @IsOptional()
  lightingAuthToken?: string;

  @ApiPropertyOptional({
    description:
      "Additional configuration specific to the lighting system type",
  })
  @IsObject()
  @IsOptional()
  lightingCustomConfig?: any;
}

export class UpdateLightingSystemDto {
  @ApiPropertyOptional({
    example: "wled",
    description: "Type of lighting system",
    enum: ["nanoleaf", "wled", "ws2812", "philips_hue"],
  })
  @IsString()
  @IsOptional()
  @IsIn(["nanoleaf", "wled", "ws2812", "philips_hue"])
  lightingSystemType?: string;

  @ApiPropertyOptional({
    example: "192.168.1.101",
    description: "Updated IP address or hostname",
  })
  @IsString()
  @IsOptional()
  lightingHostAddress?: string;

  @ApiPropertyOptional({
    example: 8080,
    description: "Updated port number",
  })
  @IsNumber()
  @IsOptional()
  lightingPort?: number;

  @ApiPropertyOptional({
    example: "new-auth-token-456",
    description: "Updated authentication token",
  })
  @IsString()
  @IsOptional()
  lightingAuthToken?: string;

  @ApiPropertyOptional({
    description: "Updated custom configuration",
  })
  @IsObject()
  @IsOptional()
  lightingCustomConfig?: any;

  @ApiPropertyOptional({
    example: true,
    description: "Whether the lighting system is configured",
  })
  @IsBoolean()
  @IsOptional()
  lightingSystemConfigured?: boolean;

  @ApiPropertyOptional({
    example: "working",
    description: "Current status of the lighting system",
    enum: ["unknown", "working", "error", "authentication_required"],
  })
  @IsString()
  @IsOptional()
  @IsIn(["unknown", "working", "error", "authentication_required"])
  lightingStatus?: string;
}

export class TestLightingSystemDto {
  @ApiProperty({
    example: "device-uuid-123",
    description: "ID of the device to test",
  })
  @IsString()
  deviceId: string;
}

export class LightingSystemStatusDto {
  @ApiProperty({
    example: "philips_hue",
    description: "Type of lighting system",
  })
  lightingSystemType: string;

  @ApiPropertyOptional({
    example: "192.168.1.100",
    description: "IP address of the lighting system",
  })
  lightingHostAddress?: string;

  @ApiPropertyOptional({
    example: 80,
    description: "Port of the lighting system",
  })
  lightingPort?: number;

  @ApiProperty({
    example: true,
    description: "Whether the lighting system is configured",
  })
  lightingSystemConfigured: boolean;

  @ApiProperty({
    example: LightingStatus.WORKING,
    description: "Current status of the lighting system",
    enum: LightingStatus,
  })
  @IsIn([
    LightingStatus.UNKNOWN,
    LightingStatus.WORKING,
    LightingStatus.ERROR,
    LightingStatus.AUTHENTICATION_REQUIRED,
  ])
  lightingStatus: LightingStatus;

  @ApiPropertyOptional({
    example: "2023-01-01T00:00:00Z",
    description: "Last time the lighting system was tested",
  })
  lightingLastTestAt?: Date;

  @ApiProperty({
    example: false,
    description: "Whether the lighting system requires authentication",
  })
  requiresAuthentication: boolean;

  @ApiPropertyOptional({
    description: "Capabilities of the lighting system",
  })
  capabilities?: any;

  @ApiPropertyOptional({
    description:
      "Full status details from the edge controller (lightingStatusDetails field)",
  })
  lightingStatusDetails?: any;
}
