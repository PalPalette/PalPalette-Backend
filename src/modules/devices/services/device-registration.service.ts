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
    device: {
      id: string;
      macAddress: string;
      pairingCode: string | null;
      status: string;
      isProvisioned: boolean;
      ownerEmail?: string;
      ownerName?: string;
      deviceType: string;
      firmwareVersion?: string;
      ipAddress?: string;
      name?: string;
      lightingSystem?: string | null;
      lightingHost?: string | null;
      lightingPort?: number | null;
      lightingAuthToken?: string | null;
    };
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

    // Check if device already exists (with user relation)
    const existingDevice = await this.deviceRepository.findOne({
      where: { macAddress },
      relations: ["user"],
    });

    if (existingDevice) {
      // Update last seen and online status
      existingDevice.isOnline = true;
      existingDevice.lastSeenAt = new Date();

      if (ipAddress) {
        existingDevice.ipAddress = ipAddress;
      }

      if (firmwareVersion) {
        existingDevice.firmwareVersion = firmwareVersion;
      }

      // Update lighting configuration if provided
      if (lightingSystemType) {
        console.log(
          existingDevice.user
            ? "💡 Updating lighting configuration for claimed device:"
            : "💡 Updating lighting configuration for unclaimed device:"
        );
        console.log("  - Old System Type:", existingDevice.lightingSystemType);
        console.log("  - New System Type:", lightingSystemType);

        existingDevice.lightingSystemType = lightingSystemType;
        existingDevice.lightingHostAddress = lightingHostAddress || null;
        existingDevice.lightingPort = lightingPort || null;
        existingDevice.lightingAuthToken = lightingAuthToken || null;
        existingDevice.lightingCustomConfig = lightingCustomConfig || null;
        existingDevice.lightingSystemConfigured = true;

        console.log("✅ Lighting configuration updated");
      }

      const savedDevice = await this.deviceRepository.save(existingDevice);

      // If device is claimed, return claimed status with owner info
      if (savedDevice.user) {
        console.log("✅ Claimed device reconnected:", savedDevice.id);
        console.log("  - Owner:", savedDevice.user.email);
        console.log("  - Lighting System:", savedDevice.lightingSystemType);

        return {
          device: {
            id: savedDevice.id,
            macAddress: savedDevice.macAddress,
            pairingCode: null, // Don't expose pairing code for claimed devices
            status: "claimed",
            isProvisioned: true,
            ownerEmail: savedDevice.user.email,
            ownerName: savedDevice.user.displayName,
            deviceType: savedDevice.type,
            firmwareVersion: savedDevice.firmwareVersion,
            ipAddress: savedDevice.ipAddress,
            name: savedDevice.name,
            lightingSystem: savedDevice.lightingSystemType,
            lightingHost: savedDevice.lightingHostAddress,
            lightingPort: savedDevice.lightingPort,
            lightingAuthToken: savedDevice.lightingAuthToken,
          },
        };
      }

      // Device exists but is unclaimed - regenerate pairing code
      const pairingCode = this.generatePairingCode();
      const pairingCodeExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      savedDevice.pairingCode = pairingCode;
      savedDevice.pairingCodeExpiresAt = pairingCodeExpiresAt;

      const updatedDevice = await this.deviceRepository.save(savedDevice);

      console.log("✅ Unclaimed device reconnected:", updatedDevice.id);
      console.log("  - New pairing code:", pairingCode);
      console.log("  - Lighting System:", updatedDevice.lightingSystemType);

      return {
        device: {
          id: updatedDevice.id,
          macAddress: updatedDevice.macAddress,
          pairingCode: pairingCode,
          status: "unclaimed",
          isProvisioned: false,
          deviceType: updatedDevice.type,
          firmwareVersion: updatedDevice.firmwareVersion,
          ipAddress: updatedDevice.ipAddress,
          name: updatedDevice.name,
          lightingSystem: updatedDevice.lightingSystemType,
          lightingHost: updatedDevice.lightingHostAddress,
          lightingPort: updatedDevice.lightingPort,
          lightingAuthToken: updatedDevice.lightingAuthToken,
        },
      };
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
      isProvisioned: false, // New devices are not provisioned yet
      lastSeenAt: new Date(),
      firmwareVersion: firmwareVersion,
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
    console.log("  - Pairing code:", pairingCode);
    console.log(
      "💡 Lighting system configured:",
      savedDevice.lightingSystemType
    );

    return {
      device: {
        id: savedDevice.id,
        macAddress: savedDevice.macAddress,
        pairingCode: pairingCode,
        status: "unclaimed",
        isProvisioned: false,
        deviceType: savedDevice.type,
        firmwareVersion: savedDevice.firmwareVersion,
        ipAddress: savedDevice.ipAddress,
        name: savedDevice.name,
        lightingSystem: savedDevice.lightingSystemType,
        lightingHost: savedDevice.lightingHostAddress,
        lightingPort: savedDevice.lightingPort,
        lightingAuthToken: savedDevice.lightingAuthToken,
      },
    };
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

    // Prepare system stats
    const systemStats = updateStatusDto.systemStats || {
      freeHeap: updateStatusDto.freeHeap,
      uptime: updateStatusDto.uptime,
      lastUpdate: new Date(),
    };

    const currentTime = updateStatusDto.lastSeenAt
      ? new Date(updateStatusDto.lastSeenAt)
      : new Date();

    try {
      // Use raw SQL for upsert operation to handle race conditions properly
      await this.deviceRepository.query(
        `
        INSERT INTO device (
          id, name, type, status, "isOnline", "isProvisioned", "lastSeenAt",
          "ipAddress", "macAddress", "firmwareVersion", "wifiRSSI", "systemStats",
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          "isOnline" = EXCLUDED."isOnline",
          "isProvisioned" = EXCLUDED."isProvisioned", 
          "lastSeenAt" = EXCLUDED."lastSeenAt",
          "ipAddress" = COALESCE(EXCLUDED."ipAddress", device."ipAddress"),
          "macAddress" = COALESCE(EXCLUDED."macAddress", device."macAddress"),
          "firmwareVersion" = COALESCE(EXCLUDED."firmwareVersion", device."firmwareVersion"),
          "wifiRSSI" = COALESCE(EXCLUDED."wifiRSSI", device."wifiRSSI"),
          "systemStats" = EXCLUDED."systemStats",
          "updatedAt" = $14
      `,
        [
          deviceId, // $1
          `PalPalette-${deviceId.substring(0, 8)}`, // $2
          "esp32c3", // $3
          "online", // $4
          updateStatusDto.isOnline ?? true, // $5
          updateStatusDto.isProvisioned ?? false, // $6
          currentTime, // $7
          updateStatusDto.ipAddress, // $8
          updateStatusDto.macAddress, // $9
          updateStatusDto.firmwareVersion, // $10
          updateStatusDto.wifiRSSI, // $11
          JSON.stringify(systemStats), // $12
          currentTime, // $13 (createdAt)
          currentTime, // $14 (updatedAt)
        ]
      );

      // Fetch the updated device
      const device = await this.deviceRepository.findOne({
        where: { id: deviceId },
      });

      if (!device) {
        throw new Error(`Failed to create or update device ${deviceId}`);
      }

      return device;
    } catch (error) {
      // If upsert fails, fall back to traditional find-and-update approach
      this.logger.warn(
        `Upsert failed for device ${deviceId}, falling back to traditional approach: ${error.message}`
      );

      let device = await this.deviceRepository.findOne({
        where: { id: deviceId },
      });

      // If device still not found after upsert failure, create it manually
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
          systemStats: systemStats,
        });

        return this.deviceRepository.save(device);
      }

      // Update existing device
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
