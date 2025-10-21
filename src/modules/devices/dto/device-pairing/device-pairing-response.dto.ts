import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class DiscoverableDeviceDto {
  @ApiProperty({
    description: "Device identifier",
    example: "device-uuid-123",
  })
  id: string;

  @ApiProperty({
    description: "Device name",
    example: "PalPalette-3AB7",
  })
  name: string;

  @ApiProperty({
    description: "Type of device",
    example: "esp32",
  })
  deviceType: string;

  @ApiPropertyOptional({
    description: "Firmware version",
    example: "1.2.3",
  })
  firmwareVersion?: string;

  @ApiPropertyOptional({
    description: "IP address of the device",
    example: "192.168.1.100",
  })
  ipAddress?: string;

  @ApiProperty({
    description: "Last 4 characters of MAC address",
    example: "3AB7",
  })
  macAddress: string;

  @ApiProperty({
    description: "Last seen timestamp",
    example: "2025-10-21T12:00:00Z",
    type: "string",
    format: "date-time",
  })
  lastSeen: Date;

  @ApiPropertyOptional({
    description: "When the pairing code expires",
    example: "2025-10-21T12:30:00Z",
    type: "string",
    format: "date-time",
    nullable: true,
  })
  pairingCodeExpires?: Date;

  @ApiProperty({
    description: "Whether the device is currently active",
    example: true,
  })
  isActive: boolean;
}

export class DiscoverUnpairedDevicesResponseDto {
  @ApiProperty({
    description: "List of discoverable unpaired devices",
    type: [DiscoverableDeviceDto],
  })
  devices: DiscoverableDeviceDto[];
}

export class PairingCodeResponseDto {
  @ApiProperty({
    description: "Six-character pairing code",
    example: "ABC123",
  })
  pairingCode: string;
}

export class DevicePairingInfoDto {
  @ApiProperty({
    description: "Device identifier",
    example: "device-uuid-123",
  })
  deviceId: string;

  @ApiProperty({
    description: "Six-character pairing code",
    example: "ABC123",
  })
  pairingCode: string;

  @ApiProperty({
    description: "Device name",
    example: "PalPalette-3AB7",
  })
  deviceName: string;

  @ApiPropertyOptional({
    description: "Firmware version",
    example: "1.2.3",
  })
  firmwareVersion?: string;

  @ApiPropertyOptional({
    description: "When the pairing code expires",
    example: "2025-10-21T12:30:00Z",
    type: "string",
    format: "date-time",
  })
  pairingExpires?: Date;
}

export class ResetDeviceResponseDto {
  @ApiProperty({
    description: "Success message",
    example: "Device reset successfully",
  })
  message: string;
}

export class SupportedLightingSystemsResponseDto {
  @ApiProperty({
    description: "Array of supported lighting system types",
    type: [String],
    example: ["nanoleaf", "wled", "ws2812", "philips_hue"],
  })
  systems: string[];

  @ApiProperty({
    description: "Default capabilities for each lighting system type",
    type: "object",
    additionalProperties: true,
  })
  capabilities: Record<string, any>;
}
