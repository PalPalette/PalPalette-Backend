import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Device } from "./entities/device.entity";
import {
  LightingSystemConfigDto,
  UpdateLightingSystemDto,
  LightingSystemStatusDto,
} from "./dto/lighting-system/lighting-system.dto";
import { DeviceWebSocketService } from "../messages/device-websocket.service";

@Injectable()
export class LightingSystemsService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @Inject(forwardRef(() => DeviceWebSocketService))
    private readonly webSocketService: DeviceWebSocketService
  ) {}

  /**
   * Configure lighting system for a device
   */
  async configureLightingSystem(
    deviceId: string,
    config: LightingSystemConfigDto
  ): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ["user"],
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    // Validate configuration based on system type
    this.validateLightingConfig(config);

    // Update device with lighting configuration
    device.lightingSystemType = config.lightingSystemType;
    device.lightingHostAddress = config.lightingHostAddress;
    device.lightingPort = config.lightingPort;
    device.lightingAuthToken = config.lightingAuthToken;
    device.lightingCustomConfig = config.lightingCustomConfig;
    device.lightingSystemConfigured = true;
    device.lightingStatus = "unknown"; // Will be updated when device reports status

    const savedDevice = await this.deviceRepository.save(device);

    // Send configuration to device via WebSocket if connected
    const configSent = this.webSocketService.sendLightingSystemConfig(
      deviceId,
      savedDevice
    );
    if (configSent) {
      console.log(`🌈 Lighting configuration sent to device ${deviceId}`);
    } else {
      console.log(
        `⚠ Device ${deviceId} not connected, configuration saved for next connection`
      );
    }

    return savedDevice;
  }

  /**
   * Update lighting system configuration
   */
  async updateLightingSystem(
    deviceId: string,
    updates: UpdateLightingSystemDto
  ): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ["user"],
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    // Apply updates
    Object.assign(device, updates);

    // Update test timestamp if status is being updated
    if (updates.lightingStatus) {
      device.lightingLastTestAt = new Date();
    }

    return this.deviceRepository.save(device);
  }

  /**
   * Get lighting system status for a device
   */
  async getLightingSystemStatus(
    deviceId: string
  ): Promise<LightingSystemStatusDto> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ["user"],
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    return {
      lightingSystemType: device.lightingSystemType,
      lightingHostAddress: device.lightingHostAddress,
      lightingPort: device.lightingPort,
      lightingSystemConfigured: device.lightingSystemConfigured,
      lightingStatus: device.lightingStatus,
      lightingLastTestAt: device.lightingLastTestAt,
      requiresAuthentication: this.systemRequiresAuthentication(
        device.lightingSystemType
      ),
      capabilities: this.getSystemCapabilities(device.lightingSystemType),
    };
  }

  /**
   * Get lighting systems for all user's devices
   */
  async getUserDevicesLightingSystems(
    userId: string
  ): Promise<LightingSystemStatusDto[]> {
    const devices = await this.deviceRepository.find({
      where: { user: { id: userId } },
      relations: ["user"],
    });

    return devices.map(
      (device) =>
        ({
          deviceId: device.id,
          deviceName: device.name,
          lightingSystemType: device.lightingSystemType,
          lightingHostAddress: device.lightingHostAddress,
          lightingPort: device.lightingPort,
          lightingSystemConfigured: device.lightingSystemConfigured,
          lightingStatus: device.lightingStatus,
          lightingLastTestAt: device.lightingLastTestAt,
          requiresAuthentication: this.systemRequiresAuthentication(
            device.lightingSystemType
          ),
          capabilities: this.getSystemCapabilities(device.lightingSystemType),
        } as any)
    );
  }

  /**
   * Reset lighting system configuration
   */
  async resetLightingSystem(deviceId: string): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ["user"],
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    // Reset to default WS2812 configuration
    device.lightingSystemType = "ws2812";
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

    return this.deviceRepository.save(device);
  }

  /**
   * Get default configuration for a lighting system type
   */
  getDefaultLightingConfig(systemType: string): any {
    switch (systemType) {
      case "nanoleaf":
        return {
          port: 16021,
          transitionTime: 10,
          enableExternalControl: true,
          defaultBrightness: 100,
        };
      case "wled":
        return {
          port: 80,
          segments: [{ id: 0, start: 0, stop: 30 }],
          defaultBrightness: 128,
        };
      case "ws2812":
        return {
          ledPin: 2,
          ledCount: 30,
          brightness: 255,
          colorOrder: "GRB",
        };
      default:
        throw new BadRequestException(
          `Unsupported lighting system type: ${systemType}`
        );
    }
  }

  /**
   * Get supported lighting system types
   */
  getSupportedLightingSystems(): string[] {
    return ["nanoleaf", "wled", "ws2812"];
  }

  /**
   * Test lighting system connection
   */
  async testLightingSystem(
    deviceId: string
  ): Promise<{ testRequested: boolean; deviceConnected: boolean }> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ["user"],
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    // Request lighting system test via WebSocket
    const deviceConnected =
      this.webSocketService.requestLightingSystemTest(deviceId);

    if (deviceConnected) {
      // Update test timestamp
      device.lightingLastTestAt = new Date();
      await this.deviceRepository.save(device);
      console.log(`🧪 Lighting test requested for device ${deviceId}`);
    } else {
      console.log(`⚠ Device ${deviceId} not connected for lighting test`);
    }

    return {
      testRequested: true,
      deviceConnected: deviceConnected,
    };
  }

  /**
   * Check if a lighting system requires authentication
   */
  private systemRequiresAuthentication(systemType: string): boolean {
    return systemType === "nanoleaf";
  }

  /**
   * Get capabilities for a lighting system type
   */
  private getSystemCapabilities(systemType: string): any {
    switch (systemType) {
      case "nanoleaf":
        return {
          maxPanels: 50,
          animations: ["static", "fade", "wheel", "flow"],
          brightness: true,
          networkRequired: true,
          authentication: true,
        };
      case "wled":
        return {
          maxLeds: 1000,
          segments: true,
          effects: true,
          brightness: true,
          networkRequired: true,
          authentication: false,
        };
      case "ws2812":
        return {
          maxLeds: 1000,
          animations: ["static", "fade", "wipe", "rainbow"],
          brightness: true,
          networkRequired: false,
          authentication: false,
        };
      default:
        return {};
    }
  }

  /**
   * Validate lighting system configuration
   */
  private validateLightingConfig(config: LightingSystemConfigDto): void {
    switch (config.lightingSystemType) {
      case "nanoleaf":
        // Nanoleaf uses auto-discovery, no host address required
        // Configuration is handled by the edge device
        break;
      case "wled":
        if (!config.lightingHostAddress) {
          throw new BadRequestException(
            "Host address is required for WLED configuration"
          );
        }
        break;
      case "ws2812":
        // WS2812 is directly connected to ESP32, no network configuration needed
        // Default pin and LED count will be used if not specified
        if (!config.lightingCustomConfig) {
          config.lightingCustomConfig = {};
        }
        // Set defaults if not provided
        if (!config.lightingCustomConfig.ledPin) {
          config.lightingCustomConfig.ledPin = 2; // Default GPIO pin
        }
        if (!config.lightingCustomConfig.ledCount) {
          config.lightingCustomConfig.ledCount = 30; // Default LED count
        }
        break;
      default:
        throw new BadRequestException(
          `Unsupported lighting system type: ${config.lightingSystemType}`
        );
    }
  }
}
