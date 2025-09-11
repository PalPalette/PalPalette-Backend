import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Device } from "../entities/device.entity";
import { User } from "../../users/entities/user.entity";
import { ClaimByCodeDto } from "../dto/device-pairing/claim-by-code.dto";
import { DeviceWebSocketService } from "../../messages/device-websocket.service";

@Injectable()
export class DevicePairingService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => DeviceWebSocketService))
    private readonly webSocketService: DeviceWebSocketService
  ) {}

  async claimDeviceByCode(
    userId: string,
    claimByCodeDto: ClaimByCodeDto
  ): Promise<Device> {
    const { pairingCode, deviceName } = claimByCodeDto;

    // Find device by pairing code
    const device = await this.deviceRepository.findOne({
      where: { pairingCode },
      relations: ["user"],
    });

    if (!device) {
      throw new NotFoundException("Invalid pairing code");
    }

    // Check if pairing code is expired
    if (
      device.pairingCodeExpiresAt &&
      device.pairingCodeExpiresAt < new Date()
    ) {
      throw new BadRequestException("Pairing code has expired");
    }

    // Check if device is already claimed
    if (device.user) {
      throw new ConflictException("Device is already claimed by another user");
    }

    // Find the user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Claim the device
    device.user = user;
    device.name = deviceName;
    device.status = "claimed";
    device.pairingCode = null; // Clear pairing code
    device.pairingCodeExpiresAt = null;

    const savedDevice = await this.deviceRepository.save(device);

    // Notify the ESP32 device via WebSocket that it has been claimed
    const claimData = {
      setupToken: savedDevice.id, // Use device ID as setup token
      userEmail: user.email,
      userName: user.displayName || user.email,
    };

    // Notify the ESP32 device via WebSocket using the database UUID
    this.webSocketService.notifyDeviceClaimed(savedDevice.id, claimData);

    return savedDevice;
  }

  async resetDevice(deviceId: string, userId: string): Promise<void> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ["user"],
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    // Verify user owns the device
    if (!device.user || device.user.id !== userId) {
      throw new BadRequestException(
        "You don't have permission to reset this device"
      );
    }

    // Notify ESP32 device to factory reset before database reset
    const factoryResetSent = this.webSocketService.sendFactoryReset(deviceId);

    if (factoryResetSent) {
      console.log(`🔄 Factory reset command sent to device ${deviceId}`);
    } else {
      console.log(
        `⚠️ Device ${deviceId} not connected, performing database reset only`
      );
    }

    // Reset device to unclaimed state in database
    device.user = null;
    device.name = `${device.type.toUpperCase()}-${device.macAddress
      .slice(-5)
      .replace(/:/g, "")}`;
    device.status = "unclaimed";
    device.isProvisioned = false; // Reset provisioning status
    device.ipAddress = null; // Clear IP address
    device.wifiRSSI = null; // Clear WiFi signal strength

    // Reset lighting system configuration
    device.lightingSystemType = "ws2812"; // Default to WS2812
    device.lightingHostAddress = null;
    device.lightingPort = null;
    device.lightingAuthToken = null;
    device.lightingCustomConfig = {
      ledPin: 2,
      ledCount: 30,
      brightness: 255,
      colorOrder: "GRB",
    };
    device.lightingSystemConfigured = false;
    device.lightingStatus = "unknown";
    device.lightingLastTestAt = null;

    // Generate new pairing code if device is online
    if (device.isOnline) {
      device.pairingCode = this.generatePairingCode();
      device.pairingCodeExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    } else {
      // Clear pairing code for offline devices
      device.pairingCode = null;
      device.pairingCodeExpiresAt = null;
    }

    await this.deviceRepository.save(device);

    console.log(`✅ Device ${deviceId} has been fully reset to factory state`);
  }

  async validatePairingCode(code: string): Promise<Device | null> {
    const device = await this.deviceRepository.findOne({
      where: { pairingCode: code },
      relations: ["user"],
    });

    if (!device) {
      return null;
    }

    // Check if code is expired
    if (
      device.pairingCodeExpiresAt &&
      device.pairingCodeExpiresAt < new Date()
    ) {
      return null;
    }

    // Check if device is already claimed
    if (device.user) {
      return null;
    }

    return device;
  }

  async getPairingCode(deviceId: string): Promise<string | null> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      select: ["id", "pairingCode", "pairingCodeExpiresAt", "user"],
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    // Don't return pairing code if device is claimed
    if (device.user) {
      return null;
    }

    // Don't return expired codes
    if (
      device.pairingCodeExpiresAt &&
      device.pairingCodeExpiresAt < new Date()
    ) {
      return null;
    }

    return device.pairingCode;
  }

  async generateNewPairingCode(deviceId: string): Promise<string> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    // Only generate new code for unclaimed devices
    if (device.user) {
      throw new BadRequestException(
        "Cannot generate pairing code for claimed device"
      );
    }

    const pairingCode = this.generatePairingCode();
    const pairingCodeExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    device.pairingCode = pairingCode;
    device.pairingCodeExpiresAt = pairingCodeExpiresAt;

    await this.deviceRepository.save(device);
    return pairingCode;
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
