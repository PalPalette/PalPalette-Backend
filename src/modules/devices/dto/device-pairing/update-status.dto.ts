import {
  IsBoolean,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  IsObject,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateStatusDto {
  @ApiPropertyOptional({
    example: true,
    description: "Whether the device is currently online",
  })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: "Whether the device has been fully provisioned",
  })
  @IsOptional()
  @IsBoolean()
  isProvisioned?: boolean;

  @ApiPropertyOptional({
    example: "192.168.1.150",
    description: "Current IP address of the device",
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    example: "2023-01-01T12:00:00Z",
    description: "Timestamp when device was last seen",
  })
  @IsOptional()
  @IsDateString()
  lastSeenAt?: string;

  @ApiPropertyOptional({
    example: "1.2.4",
    description: "Current firmware version",
  })
  @IsOptional()
  @IsString()
  firmwareVersion?: string;

  @ApiPropertyOptional({
    example: "00:1B:44:11:3A:B7",
    description: "MAC address of the device",
  })
  @IsOptional()
  @IsString()
  macAddress?: string;

  @ApiPropertyOptional({
    example: -45,
    description: "WiFi signal strength in dBm",
  })
  @IsOptional()
  @IsNumber()
  wifiRSSI?: number;

  @ApiPropertyOptional({
    description: "System statistics from the device",
    example: {
      freeHeap: 45000,
      uptime: 3600,
      lastUpdate: "2023-01-01T12:00:00Z",
    },
  })
  @IsOptional()
  @IsObject()
  systemStats?: {
    freeHeap?: number;
    uptime?: number;
    lastUpdate?: Date;
  };
}
