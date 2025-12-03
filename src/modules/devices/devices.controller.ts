import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Request,
  Put,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { DevicesService } from "./devices.service";
import { UpdateDeviceDto } from "./dto/device-management/update-device.dto";
import { RegisterDeviceDto } from "./dto/device-pairing/register-device.dto";
import { ClaimByCodeDto } from "./dto/device-pairing/claim-by-code.dto";
import { UpdateStatusDto } from "./dto/device-pairing/update-status.dto";
import {
  DiscoverUnpairedDevicesResponseDto,
  PairingCodeResponseDto,
  DevicePairingInfoDto,
  ResetDeviceResponseDto,
  SupportedLightingSystemsResponseDto,
  RegisterDeviceResponseDto,
} from "./dto/device-pairing/device-pairing-response.dto";
import {
  LightingSystemConfigDto,
  UpdateLightingSystemDto,
} from "./dto/lighting-system/lighting-system.dto";
import {
  UserNotificationDto,
  NotificationResponseDto,
} from "./dto/notifications/device-notification.dto";
import { Public } from "../../common/decorators/public.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DeviceRegistrationService } from "./services/device-registration.service";
import { DevicePairingService } from "./services/device-pairing.service";
import { LightingSystemsService } from "./lighting-systems.service";

@ApiTags("Devices")
@Controller("devices")
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly deviceRegistrationService: DeviceRegistrationService,
    private readonly devicePairingService: DevicePairingService,
    private readonly lightingSystemsService: LightingSystemsService
  ) {}

  // New self-setup endpoints
  @Public()
  @Post("register")
  @ApiOperation({
    summary: "Register or reconnect a device",
    description:
      "Devices call this on boot to register or get their current state. " +
      "Returns claim status, owner info (if claimed), and lighting configuration.",
  })
  @ApiResponse({
    status: 201,
    description:
      "Device registered/reconnected successfully. Returns different data based on claim status.",
    type: RegisterDeviceResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  async registerDevice(@Body() registerDeviceDto: RegisterDeviceDto) {
    return this.deviceRegistrationService.registerDevice(registerDeviceDto);
  }

  @Public()
  @Get("pairing-code/:deviceId")
  @ApiOperation({ summary: "Get pairing code for device" })
  @ApiParam({
    name: "deviceId",
    description: "Device ID",
    example: "device-uuid",
  })
  @ApiResponse({
    status: 200,
    description: "Pairing code retrieved successfully",
    type: PairingCodeResponseDto,
  })
  @ApiResponse({ status: 404, description: "Device not found" })
  async getPairingCode(@Param("deviceId") deviceId: string) {
    const pairingCode = await this.devicePairingService.getPairingCode(
      deviceId
    );
    return { pairingCode };
  }

  @UseGuards(JwtAuthGuard)
  @Post("claim-by-code")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Claim a device using pairing code" })
  @ApiResponse({ status: 201, description: "Device claimed successfully" })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid pairing code",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Device or pairing code not found" })
  async claimByCode(@Request() req, @Body() claimByCodeDto: ClaimByCodeDto) {
    console.log("🔍 Claim request - User:", req.user);
    console.log("🔍 User ID:", req.user.userId);
    console.log("🔍 Pairing code:", claimByCodeDto.pairingCode);

    try {
      const result = await this.devicePairingService.claimDeviceByCode(
        req.user.userId,
        claimByCodeDto
      );
      console.log("✅ Claim successful:", result);
      return result;
    } catch (error) {
      console.error("❌ Claim failed:", error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id/reset")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reset device to unclaimed state" })
  @ApiParam({ name: "id", description: "Device ID", example: "device-uuid" })
  @ApiResponse({
    status: 200,
    description: "Device reset successfully",
    type: ResetDeviceResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - not device owner" })
  @ApiResponse({ status: 404, description: "Device not found" })
  async resetDevice(@Param("id") id: string, @Request() req) {
    await this.devicePairingService.resetDevice(id, req.user.userId);
    return { message: "Device reset successfully" };
  }

  @Public()
  @Put(":id/lighting")
  @ApiOperation({
    summary: "Update lighting system configuration (device self-reporting)",
    description:
      "Devices call this endpoint after successfully connecting to their lighting system " +
      "(e.g., Nanoleaf, WLED) to store/update the configuration in the backend. " +
      "This ensures the configuration persists even if the device loses power.",
  })
  @ApiParam({
    name: "id",
    description: "Device ID (UUID)",
    example: "0c029cd4-37cd-465b-9905-f392a4b73815",
  })
  @ApiResponse({
    status: 200,
    description:
      "Lighting configuration updated successfully. Returns updated device.",
  })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 404, description: "Device not found" })
  async updateDeviceLighting(
    @Param("id") deviceId: string,
    @Body() updates: UpdateLightingSystemDto
  ) {
    console.log(
      `💡 Device ${deviceId} updating lighting configuration:`,
      updates
    );
    return this.lightingSystemsService.updateLightingSystem(deviceId, updates);
  }

  @Public()
  @Put(":id/status")
  @ApiOperation({ summary: "Update device status (for device self-reporting)" })
  @ApiParam({ name: "id", description: "Device ID", example: "device-uuid" })
  @ApiResponse({
    status: 200,
    description: "Device status updated successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 404, description: "Device not found" })
  async updateStatus(
    @Param("id") id: string,
    @Body() updateStatusDto: UpdateStatusDto
  ) {
    return this.deviceRegistrationService.updateDeviceStatus(
      id,
      updateStatusDto
    );
  }

  @Public()
  @Get("by-mac/:macAddress")
  @ApiOperation({ summary: "Find device by MAC address" })
  @ApiParam({
    name: "macAddress",
    description: "MAC address of the device",
    example: "00:1B:44:11:3A:B7",
  })
  @ApiResponse({ status: 200, description: "Device found" })
  @ApiResponse({ status: 404, description: "Device not found" })
  async findDeviceByMacAddress(@Param("macAddress") macAddress: string) {
    return this.devicesService.findByMacAddress(macAddress);
  }

  @Public()
  @Get("discover/unpaired")
  @ApiOperation({ summary: "Discover unpaired devices available for pairing" })
  @ApiResponse({
    status: 200,
    description: "List of discoverable unpaired devices",
    type: DiscoverUnpairedDevicesResponseDto,
  })
  async discoverUnpairedDevices() {
    console.log("🔍 Discovering unpaired devices...");

    const unpairedDevices = await this.devicesService.findUnpairedDevices();
    console.log(
      `📊 Found ${unpairedDevices.length} total unpaired devices in database`
    );

    const activeDevices = unpairedDevices
      .filter((device) => {
        // Only show devices active in last 30 minutes (extended from 10 for debugging)
        if (!device.lastSeenAt) {
          console.log(`⚠️ Device ${device.name} has no lastSeenAt`);
          return false;
        }
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const isRecent = device.lastSeenAt > thirtyMinutesAgo;
        console.log(
          `📅 Device ${device.name}: lastSeen=${device.lastSeenAt}, isRecent=${isRecent}`
        );
        return isRecent;
      })
      .map((device) => ({
        id: device.id,
        name: device.name || `PalPalette-${device.macAddress.slice(-4)}`,
        deviceType: device.type,
        firmwareVersion: device.firmwareVersion,
        ipAddress: device.ipAddress,
        macAddress: device.macAddress.slice(-4), // Only show last 4 chars for privacy
        lastSeen: device.lastSeenAt,
        pairingCodeExpires: device.pairingCodeExpiresAt,
        isActive: true,
      }));

    console.log(`📱 Returning ${activeDevices.length} active unpaired devices`);
    return { devices: activeDevices };
  }

  @Public()
  @Get("debug/all-devices")
  async debugAllDevices() {
    console.log("🐛 DEBUG: Fetching all devices for debugging...");
    const allDevices = await this.devicesService.findAll();

    return allDevices.map((device) => ({
      id: device.id,
      name: device.name,
      macAddress: device.macAddress,
      userId: device.user?.id || null,
      userEmail: device.user?.email || null,
      lastSeenAt: device.lastSeenAt,
      status: device.status,
      isProvisioned: device.isProvisioned,
      pairingCode: device.pairingCode,
      pairingCodeExpires: device.pairingCodeExpiresAt,
    }));
  }

  @Public()
  @Get(":deviceId/pairing-info")
  @ApiOperation({ summary: "Get pairing information for a specific device" })
  @ApiParam({
    name: "deviceId",
    description: "Device ID",
    example: "device-uuid",
  })
  @ApiResponse({
    status: 200,
    description: "Device pairing information retrieved successfully",
    type: DevicePairingInfoDto,
  })
  @ApiResponse({ status: 404, description: "Device not found" })
  @ApiResponse({
    status: 400,
    description: "Device is already claimed",
  })
  async getDevicePairingInfo(@Param("deviceId") deviceId: string) {
    const device = await this.devicesService.findOne(deviceId);

    if (!device) {
      throw new Error("Device not found");
    }

    if (device.user) {
      throw new Error("Device is already claimed");
    }

    return {
      deviceId: device.id,
      pairingCode: device.pairingCode,
      deviceName: device.name || `PalPalette-${device.macAddress.slice(-4)}`,
      firmwareVersion: device.firmwareVersion,
      pairingExpires: device.pairingCodeExpiresAt,
    };
  }

  // Lighting System Management Endpoints
  @UseGuards(JwtAuthGuard)
  @Post(":id/lighting/configure")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Configure lighting system for device" })
  @ApiParam({ name: "id", description: "Device ID", example: "device-uuid" })
  @ApiResponse({
    status: 200,
    description: "Lighting system configured successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - not device owner" })
  @ApiResponse({ status: 404, description: "Device not found" })
  async configureLightingSystem(
    @Param("id") deviceId: string,
    @Body() config: LightingSystemConfigDto,
    @Request() req
  ) {
    // Verify device belongs to user
    const device = await this.devicesService.findOne(deviceId);
    if (device.user?.id !== req.user.userId) {
      throw new Error("Unauthorized");
    }

    return this.lightingSystemsService.configureLightingSystem(
      deviceId,
      config
    );
  }

  @Public()
  @Patch(":id/lighting")
  @ApiOperation({ summary: "Update lighting system configuration" })
  @ApiParam({ name: "id", description: "Device ID", example: "device-uuid" })
  @ApiResponse({
    status: 200,
    description: "Lighting system updated successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 404, description: "Device not found" })
  async updateLightingSystem(
    @Param("id") deviceId: string,
    @Body() updates: UpdateLightingSystemDto,
    @Request() req
  ) {
    // If there's a user in the request, verify device belongs to user
    if (req.user && req.user.userId) {
      const device = await this.devicesService.findOne(deviceId);
      if (device.user?.id !== req.user.userId) {
        throw new Error("Unauthorized");
      }
    }

    return this.lightingSystemsService.updateLightingSystem(deviceId, updates);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/lighting/test")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Test lighting system connection" })
  @ApiParam({ name: "id", description: "Device ID", example: "device-uuid" })
  @ApiResponse({ status: 200, description: "Test completed successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - not device owner" })
  @ApiResponse({ status: 404, description: "Device not found" })
  @ApiResponse({
    status: 500,
    description: "Lighting system connection failed",
  })
  async testLightingSystem(@Param("id") deviceId: string, @Request() req) {
    // Verify device belongs to user
    const device = await this.devicesService.findOne(deviceId);
    if (device.user?.id !== req.user.userId) {
      throw new Error("Unauthorized");
    }

    return this.lightingSystemsService.testLightingSystem(deviceId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(":id/lighting/status")
  @ApiOperation({ summary: "Get lighting system status for a device" })
  @ApiParam({ name: "id", description: "Device ID", example: "device-uuid" })
  @ApiResponse({
    status: 200,
    description: "Lighting system status retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - not device owner" })
  @ApiResponse({ status: 404, description: "Device not found" })
  async getLightingSystemStatus(@Param("id") deviceId: string, @Request() req) {
    // Verify device belongs to user
    const device = await this.devicesService.findOne(deviceId);
    if (device.user?.id !== req.user.userId) {
      throw new Error("Unauthorized");
    }

    return this.lightingSystemsService.getLightingSystemStatus(deviceId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(":id/lighting")
  @ApiOperation({ summary: "Reset/clear lighting system configuration" })
  @ApiParam({ name: "id", description: "Device ID", example: "device-uuid" })
  @ApiResponse({
    status: 200,
    description: "Lighting system configuration cleared successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - not device owner" })
  @ApiResponse({ status: 404, description: "Device not found" })
  async resetLightingSystem(@Param("id") deviceId: string, @Request() req) {
    // Verify device belongs to user
    const device = await this.devicesService.findOne(deviceId);
    if (device.user?.id !== req.user.userId) {
      throw new Error("Unauthorized");
    }

    return this.lightingSystemsService.resetLightingSystem(deviceId);
  }

  // User Notification Endpoint for Device Authentication
  @Public()
  @Post("notifications/user-action")
  async sendUserNotification(
    @Body() notificationDto: UserNotificationDto
  ): Promise<NotificationResponseDto> {
    const notificationId = `notify_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      // Find the device to get its owner
      const device = await this.devicesService.findOne(
        notificationDto.deviceId
      );
      if (!device) {
        return {
          notificationId,
          status: "failed",
          message: "Device not found",
        };
      }

      if (!device.user) {
        return {
          notificationId,
          status: "failed",
          message: "Device has no owner",
        };
      }

      // TODO: Implement real-time notification delivery to user's mobile app
      // For now, we'll log the notification and return success
      console.log(
        "User notification for device %s:",
        notificationDto.deviceId,
        {
          action: notificationDto.action,
          message: notificationDto.message,
          userId: device.user.id,
          userEmail: device.user.email,
          pairingCode: notificationDto.pairingCode,
          additionalData: notificationDto.additionalData,
        }
      );

      return {
        notificationId,
        status: "delivered",
        message: "Notification sent to device owner",
      };
    } catch (error) {
      console.error("Error sending user notification:", error);
      return {
        notificationId,
        status: "failed",
        message: "Failed to send notification",
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("my-devices/lighting-systems")
  @ApiOperation({
    summary: "Get lighting system configurations for all user's devices",
  })
  @ApiResponse({
    status: 200,
    description:
      "Lighting system configurations retrieved successfully for all user devices",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMyDevicesLightingSystems(@Request() req) {
    return this.lightingSystemsService.getUserDevicesLightingSystems(
      req.user.userId
    );
  }

  @Get("lighting/supported-systems")
  @Public()
  @ApiOperation({
    summary: "Get list of supported lighting systems and their capabilities",
  })
  @ApiResponse({
    status: 200,
    description: "Supported lighting systems and capabilities retrieved",
    type: SupportedLightingSystemsResponseDto,
  })
  async getSupportedLightingSystems() {
    return {
      systems: this.lightingSystemsService.getSupportedLightingSystems(),
      capabilities: {
        nanoleaf:
          this.lightingSystemsService.getDefaultLightingConfig("nanoleaf"),
        wled: this.lightingSystemsService.getDefaultLightingConfig("wled"),
        ws2812: this.lightingSystemsService.getDefaultLightingConfig("ws2812"),
      },
    };
  }

  @Get("lighting/:systemType/default-config")
  @Public()
  @ApiOperation({
    summary: "Get default configuration for a specific lighting system type",
  })
  @ApiParam({
    name: "systemType",
    description: "Type of lighting system",
    example: "philips_hue",
    enum: ["nanoleaf", "wled", "ws2812", "philips_hue"],
  })
  @ApiResponse({
    status: 200,
    description: "Default configuration retrieved successfully",
  })
  async getDefaultLightingConfig(@Param("systemType") systemType: string) {
    return this.lightingSystemsService.getDefaultLightingConfig(systemType);
  }

  // Keep existing endpoints for backward compatibility (will be deprecated)
  @UseGuards(JwtAuthGuard)
  @Get("my-devices")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get devices owned by current user" })
  @ApiResponse({
    status: 200,
    description: "User devices retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getMyDevices(@Request() req) {
    return this.devicesService.findUserDevices(req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: "Get all devices (admin)" })
  @ApiResponse({
    status: 200,
    description: "All devices retrieved successfully",
  })
  findAll() {
    return this.devicesService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get device by ID" })
  @ApiParam({ name: "id", description: "Device ID", example: "device-uuid" })
  @ApiResponse({ status: 200, description: "Device retrieved successfully" })
  @ApiResponse({ status: 404, description: "Device not found" })
  findOne(@Param("id") id: string) {
    return this.devicesService.findOne(id);
  }

  @Public()
  @Patch(":id")
  update(@Param("id") id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.devicesService.update(id, updateDeviceDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.devicesService.remove(id);
  }
}
