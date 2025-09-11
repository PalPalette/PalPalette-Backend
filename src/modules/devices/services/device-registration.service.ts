import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Device } from "../entities/device.entity";
import { RegisterDeviceDto } from "../dto/device-pairing/register-device.dto";
import { UpdateStatusDto } from "../dto/device-pairing/update-status.dto";

@Injectable()
export class DeviceRegistrationService {
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
    let macAddress = deviceId;

    // If deviceId starts with "esp32-", extract the MAC address and format it
    if (deviceId.startsWith("esp32-")) {
      const macHex = deviceId.substring(6); // Remove "esp32-" prefix
      // Convert from "b0818405ff98" to "B0:81:84:05:FF:98"
      macAddress = macHex.match(/.{2}/g).join(":").toUpperCase();
    }

    // Look up device by macAddress
    const device = await this.deviceRepository.findOne({
      where: { macAddress },
    });

    if (!device) {
      throw new NotFoundException("Device not found");
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
