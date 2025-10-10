import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Device } from "../entities/device.entity";
import { RegisterDeviceDto } from "../dto/device-pairing/register-device.dto";
import { UpdateStatusDto } from "../dto/device-pairing/update-status.dto";

@Injectable()
export class DeviceRegistrationService {
  private readonly logger = new Logger(DeviceRegistrationService.name);

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>
  ) {}

  async registerDevice(registerDeviceDto: RegisterDeviceDto): Promise<{
    device: Device;
    pairingCode: string;
  }> {
    const {
      macAddress,
      ipAddress,
      deviceType = "esp32",
      firmwareVersion,
      lightingSystemType,
      lightingHostAddress,
      lightingPort,
      lightingAuthToken,
      lightingCustomConfig,
    } = registerDeviceDto;

    console.log("🔍 DEBUG: Device registration request received");
    console.log("  - MAC Address:", macAddress);
    console.log("  - Device Type:", deviceType);
    console.log("  - IP Address:", ipAddress);
    console.log("  - Firmware Version:", firmwareVersion);
    console.log("  - Lighting System Type:", lightingSystemType);
    console.log("  - Lighting Host Address:", lightingHostAddress);
    console.log("  - Lighting Port:", lightingPort);
    console.log(
      "  - Lighting Auth Token:",
      lightingAuthToken ? lightingAuthToken.substring(0, 8) + "..." : "None"
    );
    console.log("  - Lighting Custom Config:", lightingCustomConfig);

    // Check if device already exists
    const existingDevice = await this.deviceRepository.findOne({
      where: { macAddress },
    });

    if (existingDevice) {
      // If device exists and is unclaimed, generate new pairing code
      if (!existingDevice.user) {
        const pairingCode = this.generatePairingCode();
        const pairingCodeExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        existingDevice.pairingCode = pairingCode;
        existingDevice.pairingCodeExpiresAt = pairingCodeExpiresAt;
        existingDevice.isOnline = true;
        existingDevice.lastSeenAt = new Date();

        if (ipAddress) {
          existingDevice.ipAddress = ipAddress;
        }

        // Update lighting configuration if provided
        if (lightingSystemType) {
          console.log(
            "💡 Updating lighting configuration for unclaimed device:"
          );
          console.log(
            "  - Old System Type:",
            existingDevice.lightingSystemType
          );
          console.log("  - New System Type:", lightingSystemType);

          existingDevice.lightingSystemType = lightingSystemType;
          existingDevice.lightingHostAddress = lightingHostAddress || null;
          existingDevice.lightingPort = lightingPort || null;
          existingDevice.lightingAuthToken = lightingAuthToken || null;
          existingDevice.lightingCustomConfig = lightingCustomConfig || null;
          existingDevice.lightingSystemConfigured = true;

          console.log("✅ Lighting configuration updated for unclaimed device");
        }

        const savedDevice = await this.deviceRepository.save(existingDevice);
        return { device: savedDevice, pairingCode };
      } else {
        // Device is already claimed, just update status
        existingDevice.isOnline = true;
        existingDevice.lastSeenAt = new Date();

        if (ipAddress) {
          existingDevice.ipAddress = ipAddress;
        }

        // Update lighting configuration if provided
        if (lightingSystemType) {
          console.log("💡 Updating lighting configuration for claimed device:");
          console.log(
            "  - Old System Type:",
            existingDevice.lightingSystemType
          );
          console.log("  - New System Type:", lightingSystemType);

          existingDevice.lightingSystemType = lightingSystemType;
          existingDevice.lightingHostAddress = lightingHostAddress || null;
          existingDevice.lightingPort = lightingPort || null;
          existingDevice.lightingAuthToken = lightingAuthToken || null;
          existingDevice.lightingCustomConfig = lightingCustomConfig || null;
          existingDevice.lightingSystemConfigured = true;

          console.log("✅ Lighting configuration updated for claimed device");
        }

        const savedDevice = await this.deviceRepository.save(existingDevice);
        return { device: savedDevice, pairingCode: null };
      }
    }

    // Create new device
    const pairingCode = this.generatePairingCode();
    const pairingCodeExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    console.log("✨ Creating new device with lighting configuration:");
    console.log("  - System Type:", lightingSystemType || "ws2812 (default)");
    console.log("  - Host:", lightingHostAddress || "None");
    console.log("  - Port:", lightingPort || "None");

    const device = this.deviceRepository.create({
      name: `${deviceType.toUpperCase()}-${macAddress
        .slice(-5)
        .replace(/:/g, "")}`,
      type: deviceType,
      macAddress,
      ipAddress,
      pairingCode,
      pairingCodeExpiresAt,
      status: "unclaimed",
      isOnline: true,
      isProvisioned: true,
      lastSeenAt: new Date(),
      // Set lighting configuration if provided
      lightingSystemType: lightingSystemType || "ws2812", // Default to ws2812
      lightingHostAddress: lightingHostAddress || null,
      lightingPort: lightingPort || null,
      lightingAuthToken: lightingAuthToken || null,
      lightingCustomConfig: lightingCustomConfig || null,
      lightingSystemConfigured: !!lightingSystemType, // True if lighting system was specified
    });

    const savedDevice = await this.deviceRepository.save(device);
    console.log("✅ New device created with ID:", savedDevice.id);
    console.log(
      "💡 Lighting system configured:",
      savedDevice.lightingSystemType
    );
    return { device: savedDevice, pairingCode };
  }

  async updateDeviceStatus(
    deviceId: string,
    updateStatusDto: UpdateStatusDto
  ): Promise<Device> {
    // Strictly require deviceId to be a valid UUID v4
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidV4Regex.test(deviceId)) {
      throw new Error(
        `Invalid deviceId: '${deviceId}'. Must be a valid UUID v4. No MAC/legacy fallback allowed.`
      );
    }

    // Find device by UUID
    let device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    // If device not found, create it (auto-registration)
    if (!device) {
      this.logger.warn(
        `Device ${deviceId} not found, creating new device entry`
      );

      device = this.deviceRepository.create({
        id: deviceId,
        name: `PalPalette-${deviceId.substring(0, 8)}`,
        type: "esp32c3",
        status: "online",
        isOnline: true,
        isProvisioned: false,
        lastSeenAt: new Date(),
        user: null,
        // Set fields from updateStatusDto
        ipAddress: updateStatusDto.ipAddress,
        macAddress: updateStatusDto.macAddress,
        firmwareVersion: updateStatusDto.firmwareVersion,
        wifiRSSI: updateStatusDto.wifiRSSI,
        systemStats: updateStatusDto.systemStats || {
          freeHeap: updateStatusDto.freeHeap,
          uptime: updateStatusDto.uptime,
          lastUpdate: new Date(),
        },
      });

      return this.deviceRepository.save(device);
    }

    // Update provided fields
    if (updateStatusDto.isOnline !== undefined) {
      device.isOnline = updateStatusDto.isOnline;
    }

    if (updateStatusDto.isProvisioned !== undefined) {
      device.isProvisioned = updateStatusDto.isProvisioned;
    }

    if (updateStatusDto.ipAddress) {
      device.ipAddress = updateStatusDto.ipAddress;
    }

    if (updateStatusDto.macAddress) {
      device.macAddress = updateStatusDto.macAddress;
    }

    if (updateStatusDto.firmwareVersion) {
      device.firmwareVersion = updateStatusDto.firmwareVersion;
    }

    if (updateStatusDto.wifiRSSI !== undefined) {
      device.wifiRSSI = updateStatusDto.wifiRSSI;
    }

    // Handle system stats (both object format and direct properties)
    if (
      updateStatusDto.systemStats ||
      updateStatusDto.freeHeap !== undefined ||
      updateStatusDto.uptime !== undefined
    ) {
      device.systemStats = {
        ...device.systemStats,
        ...updateStatusDto.systemStats,
        freeHeap:
          updateStatusDto.freeHeap ??
          updateStatusDto.systemStats?.freeHeap ??
          device.systemStats?.freeHeap,
        uptime:
          updateStatusDto.uptime ??
          updateStatusDto.systemStats?.uptime ??
          device.systemStats?.uptime,
        lastUpdate: new Date(),
      };
    }

    if (updateStatusDto.lastSeenAt) {
      device.lastSeenAt = new Date(updateStatusDto.lastSeenAt);
    } else {
      device.lastSeenAt = new Date();
    }

    return this.deviceRepository.save(device);
  }

  async getDeviceByMac(macAddress: string): Promise<Device | null> {
    return this.deviceRepository.findOne({
      where: { macAddress },
      relations: ["user"],
    });
  }

  async getDeviceById(deviceId: string): Promise<Device | null> {
    return this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ["user"],
    });
  }

  private generatePairingCode(): string {
    // Generate 6-character alphanumeric code (avoiding confusing characters)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
