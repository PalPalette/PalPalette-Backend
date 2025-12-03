import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  IsNumber,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterDeviceDto {
  @ApiProperty({
    example: "00:1B:44:11:3A:B7",
    description: "MAC address of the device in XX:XX:XX:XX:XX:XX format",
    pattern: "^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$",
  })
  @Matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, {
    message:
      "macAddress must be a valid MAC address format (XX:XX:XX:XX:XX:XX)",
  })
  @IsNotEmpty()
  macAddress: string;

  @ApiPropertyOptional({
    example: "192.168.1.100",
    description: "IP address of the device",
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    example: "PalPalette-LED-Controller",
    description: "Type of the device",
  })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({
    example: "1.2.3",
    description: "Firmware version of the device",
  })
  @IsOptional()
  @IsString()
  firmwareVersion?: string;

  // Lighting system configuration (optional - can be updated later via PUT /devices/:id/lighting)
  @ApiPropertyOptional({
    example: "nanoleaf",
    description:
      "Type of lighting system (optional during registration, can be configured later)",
    enum: ["nanoleaf", "wled", "ws2812", "philips_hue"],
  })
  @IsOptional()
  @IsString()
  lightingSystemType?: string;

  @ApiPropertyOptional({
    example: "192.168.1.50",
    description:
      "IP address or hostname of the lighting system (optional during registration)",
  })
  @IsOptional()
  @IsString()
  lightingHostAddress?: string;

  @ApiPropertyOptional({
    example: 16021,
    description:
      "Port for lighting system connection (optional during registration)",
  })
  @IsOptional()
  @IsNumber()
  lightingPort?: number;

  @ApiPropertyOptional({
    example: "abc123TokenXyz789",
    description:
      "Authentication token for lighting system (optional during registration)",
  })
  @IsOptional()
  @IsString()
  lightingAuthToken?: string;

  @ApiPropertyOptional({
    description:
      "Custom configuration object for specific lighting systems (optional during registration)",
  })
  @IsOptional()
  @IsObject()
  lightingCustomConfig?: any;
}
