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

export class RegisterDeviceResponseDto {
  @ApiProperty({
    description: "Device information",
    type: "object",
  })
  device: {
    @ApiProperty({
      description: "Device unique identifier (UUID)",
      example: "0c029cd4-37cd-465b-9905-f392a4b73815",
    })
    id: string;

    @ApiProperty({
      description: "Device MAC address",
      example: "B0:81:84:05:FF:98",
    })
    macAddress: string;

    @ApiProperty({
      description:
        "Six-character pairing code (null for claimed devices)",
      example: "ABC123",
      nullable: true,
    })
    pairingCode: string | null;

    @ApiProperty({
      description: "Device claim status",
      example: "claimed",
      enum: ["claimed", "unclaimed"],
    })
    status: string;

    @ApiProperty({
      description: "Whether device has been provisioned",
      example: true,
    })
    isProvisioned: boolean;

    @ApiPropertyOptional({
      description: "Owner email (only for claimed devices)",
      example: "test@example.com",
    })
    ownerEmail?: string;

    @ApiPropertyOptional({
      description: "Owner display name (only for claimed devices)",
      example: "Test User",
    })
    ownerName?: string;

    @ApiProperty({
      description: "Device type",
      example: "esp32",
    })
    deviceType: string;

    @ApiPropertyOptional({
      description: "Firmware version",
      example: "2.0.0",
    })
    firmwareVersion?: string;

    @ApiPropertyOptional({
      description: "Device IP address",
      example: "192.168.1.100",
    })
    ipAddress?: string;

    @ApiPropertyOptional({
      description: "Device name",
      example: "ESP32-FF98",
    })
    name?: string;

    @ApiPropertyOptional({
      description: "Configured lighting system type",
      example: "nanoleaf",
      enum: ["nanoleaf", "wled", "ws2812", "philips_hue"],
      nullable: true,
    })
    lightingSystem?: string | null;

    @ApiPropertyOptional({
      description: "Lighting system host address (IP or hostname)",
      example: "192.168.1.50",
      nullable: true,
    })
    lightingHost?: string | null;

    @ApiPropertyOptional({
      description: "Lighting system port",
      example: 16021,
      nullable: true,
    })
    lightingPort?: number | null;

    @ApiPropertyOptional({
      description: "Lighting system authentication token",
      example: "abc123token",
      nullable: true,
    })
    lightingAuthToken?: string | null;
  };
}
