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

  // Lighting system configuration (from captive portal)
  @ApiPropertyOptional({
    example: "philips_hue",
    description: "Type of lighting system to connect to",
  })
  @IsOptional()
  @IsString()
  lightingSystemType?: string;

  @ApiPropertyOptional({
    example: "192.168.1.2",
    description: "Host address of the lighting system",
  })
  @IsOptional()
  @IsString()
  lightingHostAddress?: string;

  @ApiPropertyOptional({
    example: 80,
    description: "Port for lighting system connection",
  })
  @IsOptional()
  @IsNumber()
  lightingPort?: number;

  @ApiPropertyOptional({
    example: "hue-auth-token-123",
    description: "Authentication token for lighting system",
  })
  @IsOptional()
  @IsString()
  lightingAuthToken?: string;

  @ApiPropertyOptional({
    description: "Custom configuration object for specific lighting systems",
  })
  @IsOptional()
  @IsObject()
  lightingCustomConfig?: any;
}
