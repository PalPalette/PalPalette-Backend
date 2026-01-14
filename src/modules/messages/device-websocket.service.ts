import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Inject,
  forwardRef,
} from "@nestjs/common";
import * as WebSocket from "ws";
import { createServer } from "http";
import { DevicesService } from "../devices/devices.service";
import { ApiUrlService } from "../../common/services/api-url.service";

@Injectable()
export class DeviceWebSocketService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DeviceWebSocketService.name);
  private wss: WebSocket.Server;
  private deviceConnections = new Map<string, WebSocket>(); // Database UUID -> WebSocket
  private server: any;

  constructor(
    @Inject(forwardRef(() => DevicesService))
    private readonly devicesService: DevicesService,
    private readonly apiUrlService: ApiUrlService
  ) {}

  async onApplicationBootstrap() {
    // Initialize after the application starts instead of using setTimeout
    this.initializeServer();
  }

  private initializeServer() {
    try {
      this.logger.log(
        "🚀 Initializing Device WebSocket server for ESP32 devices..."
      );

      // Create HTTP server first
      this.server = createServer();

      // Create WebSocket server
      this.wss = new WebSocket.Server({
        server: this.server,
        path: "/ws",
      });

      this.wss.on("connection", (ws: WebSocket, request) => {
        const clientIP = request.socket.remoteAddress || "unknown";
        this.logger.log(`ESP32 WebSocket client connected from: ${clientIP}`);

        // Handle ping frames (heartbeats) - this updates lastSeenAt
        ws.on("ping", async (data) => {
          this.logger.debug(`💓 Ping received from ${clientIP}`);

          // Find the device associated with this WebSocket
          let deviceId = null;
          for (const [id, connection] of this.deviceConnections.entries()) {
            if (connection === ws) {
              deviceId = id;
              break;
            }
          }

          if (deviceId) {
            try {
              // Update lastSeenAt in database
              await this.updateDeviceLastSeen(deviceId);
              this.logger.debug(
                `💓 Updated lastSeenAt for device: ${deviceId}`
              );
            } catch (error) {
              this.logger.error(
                `❌ Failed to update lastSeenAt for device ${deviceId}: ${error.message}`
              );
            }
          }

          // Send pong response (WebSocket auto-responds, but we can log it)
          this.logger.debug(`🏓 Pong sent to ${clientIP}`);
        });

        ws.on("message", (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(ws, message);
          } catch (error) {
            this.logger.error(
              `JSON parse error from ${clientIP}: ${error.message}`,
              error.stack
            );
            // Send error response safely
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(
                  JSON.stringify({
                    error: "Invalid JSON format",
                    timestamp: new Date().toISOString(),
                  })
                );
              } catch (sendError) {
                this.logger.error(
                  `Failed to send error response to ${clientIP}: ${sendError.message}`
                );
              }
            }
          }
        });

        ws.on("close", (code, reason) => {
          this.logger.log(
            `ESP32 WebSocket client disconnected from: ${clientIP} (code: ${code}, reason: ${reason})`
          );
          this.removeDeviceConnection(ws);
        });

        ws.on("error", (error) => {
          this.logger.error(
            `WebSocket error from ${clientIP}: ${error.message}`,
            error.stack
          );
          // Cleanup connection on error
          this.removeDeviceConnection(ws);
        });
      });

      // Listen on all interfaces (important for Docker)
      this.server.listen(3001, "0.0.0.0", () => {
        this.logger.log("✅ Raw WebSocket server listening on 0.0.0.0:3001");
        this.logger.log("🔌 ESP32 devices can connect to ws://YOUR_IP:3001/ws");
      });

      this.server.on("error", (error: any) => {
        if (error.code === "EADDRINUSE") {
          this.logger.error(
            `❌ Port 3001 is already in use. Retrying in 5 seconds...`
          );
          setTimeout(() => this.initializeServer(), 5000);
        } else {
          this.logger.error(`❌ Server error: ${error.message}`);
        }
      });
    } catch (error) {
      this.logger.error(
        `❌ Failed to start WebSocket server: ${error.message}`
      );
      this.logger.error(`Stack trace: ${error.stack}`);
    }
  }

  private async handleMessage(ws: WebSocket, message: any) {
    this.logger.log("Received message:", message);

    if (message.event === "registerDevice") {
      const {
        deviceId,
        macAddress,
        ipAddress,
        firmwareVersion,
        isProvisioned,
        pairingCode,
      } = message.data;

      this.logger.log(`🔍 Device registration request for: ${deviceId}`);

      // Device should always send database UUID now
      if (!deviceId || deviceId.length < 30) {
        this.logger.error(
          `❌ Invalid device ID format: ${deviceId}. Expected database UUID.`
        );
        ws.send(
          JSON.stringify({
            event: "registrationError",
            data: {
              error: "Invalid device ID format. Expected database UUID.",
            },
          })
        );
        return;
      }

      try {
        // First, ensure device exists in database
        await this.ensureDeviceInDatabase({
          id: deviceId,
          macAddress,
          ipAddress,
          firmwareVersion,
          isProvisioned,
          pairingCode,
        });

        // Check if device was previously connected
        if (this.deviceConnections.has(deviceId)) {
          this.logger.log(`Device was already registered, updating connection`);
        }

        // Register WebSocket connection with database UUID
        this.deviceConnections.set(deviceId, ws);
        this.logger.log(
          `✅ Device registered: ${deviceId} (Total connected: ${this.deviceConnections.size})`
        );

        // Send pending lighting configuration if any
        await this.sendPendingLightingConfig(deviceId);

        ws.send(
          JSON.stringify({
            event: "deviceRegistered",
            data: { deviceId: deviceId, status: "registered" },
          })
        );
      } catch (error) {
        this.logger.error(
          `❌ Failed to register device ${deviceId}: ${error.message}`
        );
        ws.send(
          JSON.stringify({
            event: "registrationError",
            data: {
              error: "Failed to register device in database",
              details: error.message,
            },
          })
        );
      }
    } else if (message.event === "completeSetup") {
      this.handleSetupCompletion(ws, message.data);
    } else if (message.event === "lightingSystemStatus") {
      this.handleLightingSystemStatus(ws, message.data);
    } else if (message.event === "deviceStatus") {
      this.handleDeviceStatus(ws, message.data);
    } else if (message.event === "lightingSystemTest") {
      this.handleLightingSystemTest(ws, message.data);
    } else if (message.event === "userActionRequired") {
      this.handleUserActionRequired(ws, message.data);
    } else if (message.event === "user_action_required") {
      // Handle legacy format as well
      this.handleUserActionRequired(ws, message.data);
    } else if (message.event === "factoryResetAcknowledged") {
      this.handleFactoryResetAcknowledged(ws, message.data);
    } else {
      this.logger.warn(`Unknown message event: ${message.event}`);
    }
  }

  private async sendPendingLightingConfig(deviceId: string): Promise<void> {
    // This method would check if there's pending lighting configuration
    // for the device and send it if needed
    this.logger.debug(
      `Checking for pending lighting config for device: ${deviceId}`
    );
  }

  private async updateDeviceLastSeen(deviceId: string): Promise<void> {
    try {
      // deviceId should be a database UUID
      if (!deviceId || deviceId.length < 30) {
        this.logger.error(
          `Invalid device ID format: ${deviceId}. Expected database UUID.`
        );
        return;
      }

      // Update device lastSeenAt via HTTP API using database UUID
      const updateResponse = await fetch(
        this.apiUrlService.getDevicesApiUrl(deviceId),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lastSeenAt: new Date().toISOString(),
          }),
        }
      );

      if (updateResponse.ok) {
        this.logger.debug(`✅ Updated lastSeenAt for device: ${deviceId}`);
      } else {
        this.logger.error(
          `❌ Failed to update lastSeenAt: ${await updateResponse.text()}`
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to update lastSeenAt for device ${deviceId}: ${error.message}`
      );
    }
  }

  private async handleSetupCompletion(ws: WebSocket, data: any) {
    this.logger.log("Handling setup completion:", data);

    try {
      // Forward to HTTP API for setup completion
      const response = await fetch(
        this.apiUrlService.getApiUrl("/devices/setup-complete"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (response.ok) {
        const result = await response.json();

        // Send confirmation back to device
        ws.send(
          JSON.stringify({
            event: "setupComplete",
            data: {
              status: "completed",
              deviceId: data.deviceId,
            },
          })
        );

        this.logger.log(`Setup completed for device: ${data.deviceId}`);
      } else {
        this.logger.error(`Setup completion failed: ${await response.text()}`);

        ws.send(
          JSON.stringify({
            event: "setupError",
            data: {
              status: "failed",
              deviceId: data.deviceId,
            },
          })
        );
      }
    } catch (error) {
      this.logger.error(`Setup completion error: ${error.message}`);

      ws.send(
        JSON.stringify({
          event: "setupError",
          data: {
            status: "error",
            deviceId: data.deviceId,
          },
        })
      );
    }
  }

  private async handleUserActionRequired(ws: WebSocket, data: any) {
    const {
      deviceId,
      action,
      instructions,
      timeout,
      type,
      systemType,
      displayMessage,
    } = data;

    try {
      const device = await this.devicesService.findOne(deviceId);
      if (!device) {
        this.logger.error(`Device not found for user action: ${deviceId}`);
        return;
      }

      // Create notification for the user
      const notification = {
        deviceId,
        deviceName: device.name,
        action,
        instructions,
        timeout,
        type: type || "user_action_required",
        systemType: systemType || "unknown",
        displayMessage: displayMessage || instructions,
        timestamp: Date.now(),
      };

      this.logger.log(
        `🔔 User action required for device ${deviceId} (${device.name}): ${action}`
      );
      this.logger.log(`📝 Instructions: ${instructions}`);
      this.logger.log(`⏰ Timeout: ${timeout} seconds`);

      if (systemType) {
        this.logger.log(`🔧 System Type: ${systemType}`);
      }

      // TODO: Implement real-time notification service to send to user's browser
      // For now, store in database or cache for HTTP API to retrieve
      this.logger.debug("Full notification data:", notification);
    } catch (error) {
      this.logger.error("Error handling user action required:", error);
    }
  }

  private async handleDeviceStatus(ws: WebSocket, data: any) {
    this.logger.log("📱 Handling device status update:", data);

    try {
      const {
        deviceId,
        isOnline,
        isProvisioned,
        firmwareVersion,
        ipAddress,
        macAddress,
        wifiRSSI,
        freeHeap,
        uptime,
      } = data;

      // Update device status via HTTP API
      const updateData = {
        isOnline: isOnline !== undefined ? isOnline : true,
        lastSeenAt: new Date().toISOString(),
        firmwareVersion,
        ipAddress,
        macAddress,
        wifiRSSI,
        systemStats: {
          freeHeap,
          uptime,
          lastUpdate: new Date(),
        },
      };

      const response = await fetch(
        this.apiUrlService.getDevicesApiUrl(deviceId, "status"),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (response.ok) {
        this.logger.log(`✅ Device status updated for: ${deviceId}`);
        this.logger.log(`📡 IP: ${ipAddress}, RSSI: ${wifiRSSI}dBm`);
        this.logger.log(`💾 Free Heap: ${freeHeap}B, Uptime: ${uptime}s`);

        // Send acknowledgment back to device
        ws.send(
          JSON.stringify({
            event: "deviceStatusAck",
            data: {
              deviceId: deviceId,
              status: "received",
            },
          })
        );
      } else {
        this.logger.error(
          `❌ Device status update failed: ${await response.text()}`
        );
      }
    } catch (error) {
      this.logger.error(`❌ Device status update error: ${error.message}`);
    }
  }

  private async handleLightingSystemStatus(ws: WebSocket, data: any) {
    this.logger.log("📊 Handling lighting system status update:", data);
    try {
      const { deviceId } = data;
      if (!deviceId) {
        this.logger.error("No deviceId provided in lightingSystemStatus event");
        return;
      }
      // Store the full status payload in lightingStatusDetails
      const deviceRepository = this.devicesService["deviceRepository"];
      await deviceRepository.update(deviceId, {
        lightingStatusDetails: data,
        lightingLastStatusUpdate: new Date(),
        // Optionally, update the summary status field for quick filtering
        lightingStatus: data.status || "unknown",
      });
      this.logger.log(
        `✅ Lighting system status details updated for device: ${deviceId}`
      );
      // Send acknowledgment back to device
      ws.send(
        JSON.stringify({
          event: "lightingStatusAck",
          data: {
            deviceId: deviceId,
            status: "received",
          },
        })
      );
    } catch (error) {
      this.logger.error(
        `❌ Lighting system status update error: ${error.message}`
      );
    }
  }

  private async handleLightingSystemTest(ws: WebSocket, data: any) {
    this.logger.log("Handling lighting system test result:", data);

    // Validate deviceId: must be a string that only contains alphanumeric, dash, or underscore and is between 1 and 64 chars
    if (
      !data.deviceId ||
      typeof data.deviceId !== "string" ||
      !/^[A-Za-z0-9_-]{1,64}$/.test(data.deviceId)
    ) {
      this.logger.error(
        `Invalid deviceId in lightingSystemTest: ${JSON.stringify(
          data.deviceId
        )}`
      );
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            event: "lightingSystemTestError",
            data: {
              error: "Invalid deviceId provided",
            },
          })
        );
      }
      return;
    }

    try {
      // Update lighting system test result via HTTP API
      const response = await fetch(
        this.apiUrlService.getDevicesApiUrl(data.deviceId, "lighting"),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lightingStatus: data.success ? "working" : "error",
            lightingLastTestAt: new Date(),
          }),
        }
      );

      if (response.ok) {
        this.logger.log(
          `Lighting system test result updated for device: ${data.deviceId}`
        );

        // Send acknowledgment back to device
        ws.send(
          JSON.stringify({
            event: "lightingTestAck",
            data: {
              deviceId: data.deviceId,
              testResult: data.success ? "passed" : "failed",
            },
          })
        );
      } else {
        this.logger.error(
          `Lighting test result update failed: ${await response.text()}`
        );
      }
    } catch (error) {
      this.logger.error(`Lighting test result update error: ${error.message}`);
    }
  }

  private async handleFactoryResetAcknowledged(ws: WebSocket, data: any) {
    this.logger.log("🔄 Handling factory reset acknowledgment:", data);

    const { deviceId, timestamp } = data;

    if (!deviceId) {
      this.logger.error(
        "No deviceId provided in factoryResetAcknowledged event"
      );
      return;
    }

    try {
      // Delete device from database
      const device = await this.devicesService.findOne(deviceId);
      if (device) {
        await this.devicesService.remove(deviceId);
        this.logger.log(
          `✅ Device ${deviceId} has been completely removed from the database after factory reset acknowledgment`
        );
      } else {
        this.logger.warn(
          `Device ${deviceId} not found in database (may have been already deleted)`
        );
      }

      // Close the WebSocket connection
      this.removeDeviceConnection(ws);

      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "Device factory reset completed");
      }

      this.logger.log(
        `🔄 Factory reset completed for device: ${deviceId} at timestamp: ${timestamp}`
      );
    } catch (error) {
      this.logger.error(
        `❌ Error handling factory reset acknowledgment for device ${deviceId}: ${error.message}`,
        error.stack
      );
    }
  }

  private removeDeviceConnection(ws: WebSocket) {
    const devicesToRemove: string[] = [];

    // Find all device IDs associated with this WebSocket
    for (const [deviceId, socket] of this.deviceConnections.entries()) {
      if (socket === ws) {
        devicesToRemove.push(deviceId);
      }
    }

    // Remove all found connections
    for (const deviceId of devicesToRemove) {
      this.deviceConnections.delete(deviceId);
      this.logger.log(`🗑️ Removed device connection: ${deviceId}`);
    }

    if (devicesToRemove.length > 0) {
      this.logger.log(
        `🗑️ Removed ${devicesToRemove.length} device connection(s) (Total remaining: ${this.deviceConnections.size})`
      );
    }
  }

  sendColorPaletteToDevice(deviceId: string, palette: any): boolean {
    try {
      this.logger.debug(
        `Attempting to send color palette to device: ${deviceId}`
      );
      this.logger.debug(
        `Currently connected devices: ${Array.from(
          this.deviceConnections.keys()
        ).join(", ")}`
      );

      // Validate input parameters
      if (!deviceId || typeof deviceId !== "string") {
        this.logger.error(
          "Invalid deviceId provided to sendColorPaletteToDevice"
        );
        return false;
      }

      if (!palette || !palette.colors || !Array.isArray(palette.colors)) {
        this.logger.error(
          "Invalid palette provided to sendColorPaletteToDevice"
        );
        return false;
      }

      // deviceId should be a database UUID
      const ws = this.deviceConnections.get(deviceId);

      if (ws && ws.readyState === WebSocket.OPEN) {
        const message = {
          event: "colorPalette",
          messageId: palette.messageId,
          senderId: palette.senderId,
          senderName: palette.senderName,
          colors: palette.colors,
          timestamp: palette.timestamp || Date.now(),
        };

        try {
          ws.send(JSON.stringify(message));
          this.logger.log(`Color palette sent to device: ${deviceId}`);
          return true;
        } catch (sendError) {
          this.logger.error(
            `Failed to send message to device ${deviceId}: ${sendError.message}`,
            sendError.stack
          );
          // Remove broken connection
          this.removeDeviceConnection(ws);
          return false;
        }
      }

      if (ws) {
        this.logger.warn(
          `Device ${deviceId} WebSocket connection state: ${ws.readyState} (expected: ${WebSocket.OPEN})`
        );
        // Clean up non-open connections
        if (
          ws.readyState === WebSocket.CLOSED ||
          ws.readyState === WebSocket.CLOSING
        ) {
          this.removeDeviceConnection(ws);
        }
      } else {
        this.logger.warn(`Device ${deviceId} not found in connections map`);
      }

      this.logger.warn(`Device ${deviceId} not connected`);
      return false;
    } catch (error) {
      this.logger.error(
        `Unexpected error in sendColorPaletteToDevice for device ${deviceId}: ${error.message}`,
        error.stack
      );
      return false;
    }
  }

  notifyDeviceClaimed(deviceId: string, claimData: any): boolean {
    this.logger.debug(`🔍 Attempting to notify device ${deviceId} of claim`);
    this.logger.debug(
      `Currently connected devices: ${Array.from(
        this.deviceConnections.keys()
      ).join(", ")}`
    );

    // deviceId should be a database UUID
    const ws = this.deviceConnections.get(deviceId);

    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = {
        event: "deviceClaimed",
        data: {
          setupToken: claimData.setupToken,
          userEmail: claimData.userEmail,
          userName: claimData.userName,
        },
      };

      ws.send(JSON.stringify(message));
      this.logger.log(`✅ Device claimed notification sent to ${deviceId}`);
      return true;
    }

    if (ws) {
      this.logger.warn(
        `Device ${deviceId} WebSocket connection state: ${ws.readyState} (expected: ${WebSocket.OPEN})`
      );
    } else {
      this.logger.warn(
        `Device ${deviceId} not found in connections. Available devices: ${
          Array.from(this.deviceConnections.keys()).join(", ") || "none"
        }`
      );
    }

    this.logger.warn(`Device ${deviceId} not connected for claim notification`);
    return false;
  }

  getConnectedDevices(): string[] {
    const connectedDevices = Array.from(this.deviceConnections.keys());
    this.logger.debug(
      `Currently connected devices: ${connectedDevices.join(", ") || "none"}`
    );
    return connectedDevices;
  }

  sendLightingSystemConfig(deviceId: string, config: any): boolean {
    const ws = this.deviceConnections.get(deviceId);

    if (ws && ws.readyState === WebSocket.OPEN) {
      // Create the base message data
      const messageData: any = {
        systemType: config.lightingSystemType,
      };

      // For Nanoleaf, only include host/port if they're actually provided
      // Otherwise let the controller use mDNS discovery
      if (config.lightingSystemType === "nanoleaf") {
        // Only include host address if it's a valid value
        if (
          config.lightingHostAddress &&
          config.lightingHostAddress !== "null" &&
          config.lightingHostAddress.trim() !== ""
        ) {
          messageData.hostAddress = config.lightingHostAddress;
          messageData.port = config.lightingPort || 16021; // Nanoleaf default port
        }
        // Always include auth token if available
        if (config.lightingAuthToken) {
          messageData.authToken = config.lightingAuthToken;
        }
      } else {
        // For other systems (WLED, WS2812), include all fields
        messageData.hostAddress = config.lightingHostAddress;
        messageData.port = config.lightingPort;
        messageData.authToken = config.lightingAuthToken;
      }

      // Include custom config if available
      if (config.lightingCustomConfig) {
        messageData.customConfig = config.lightingCustomConfig;
      }

      const message = {
        event: "lightingSystemConfig",
        data: messageData,
      };

      ws.send(JSON.stringify(message));
      this.logger.log(`Lighting system config sent to device: ${deviceId}`);
      this.logger.debug(`Config data: ${JSON.stringify(messageData)}`);
      return true;
    }

    this.logger.warn(`Device ${deviceId} not connected for lighting config`);
    return false;
  }

  requestLightingSystemTest(deviceId: string): boolean {
    this.logger.debug(
      `Attempting to send lighting test to device: ${deviceId}`
    );
    this.logger.debug(
      `Currently connected devices: ${Array.from(
        this.deviceConnections.keys()
      ).join(", ")}`
    );

    const ws = this.deviceConnections.get(deviceId);

    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = {
        event: "testLightingSystem",
        data: {
          deviceId: deviceId,
          timestamp: Date.now(),
        },
      };

      ws.send(JSON.stringify(message));
      this.logger.log(`Lighting system test requested for device: ${deviceId}`);
      return true;
    }

    if (ws) {
      this.logger.warn(
        `Device ${deviceId} WebSocket connection state: ${ws.readyState} (expected: ${WebSocket.OPEN})`
      );
    } else {
      this.logger.warn(`Device ${deviceId} not found in connections map`);
    }

    this.logger.warn(`Device ${deviceId} not connected for lighting test`);
    return false;
  }

  sendFactoryReset(deviceId: string): boolean {
    this.logger.debug(
      `Attempting to send factory reset to device: ${deviceId}`
    );
    this.logger.debug(
      `Currently connected devices: ${Array.from(
        this.deviceConnections.keys()
      ).join(", ")}`
    );

    const ws = this.deviceConnections.get(deviceId);

    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = {
        event: "factoryReset",
        data: {
          deviceId: deviceId,
          timestamp: Date.now(),
          message: "Device has been reset by user. Returning to setup mode.",
        },
      };

      ws.send(JSON.stringify(message));
      this.logger.log(`Factory reset command sent to device: ${deviceId}`);

      // Remove the device from our connections since it will restart
      this.removeDeviceConnection(deviceId);

      return true;
    }

    this.logger.warn(`Device ${deviceId} not connected for factory reset`);
    return false;
  }

  /**
   * Ensures device exists in database, creates it if it doesn't exist
   */
  private async ensureDeviceInDatabase(deviceData: {
    id: string;
    macAddress?: string;
    ipAddress?: string;
    firmwareVersion?: string;
    isProvisioned?: boolean;
    pairingCode?: string;
  }): Promise<void> {
    // Strictly require id to be a valid UUID v4
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidV4Regex.test(deviceData.id)) {
      throw new Error(
        `Invalid device id: '${deviceData.id}'. Must be a valid UUID v4. No MAC/legacy fallback allowed.`
      );
    }
    try {
      // Check if device already exists
      let existingDevice;
      try {
        existingDevice = await this.devicesService.findOne(deviceData.id);
      } catch (error) {
        // Device not found, will create new one
        existingDevice = null;
      }

      if (existingDevice) {
        // Update existing device with new information using repository directly
        const deviceRepository = this.devicesService["deviceRepository"];

        // Prepare update data
        const updateData: any = {
          ipAddress: deviceData.ipAddress,
          firmwareVersion: deviceData.firmwareVersion,
          status: "online",
          isOnline: true,
          lastSeenAt: new Date(),
        };

        // Only update provisioning status and pairing code for unclaimed devices
        if (!existingDevice.user) {
          updateData.isProvisioned = deviceData.isProvisioned;
          updateData.pairingCode = deviceData.pairingCode;
          this.logger.log(
            `📝 Updating unclaimed device in database: ${deviceData.id}`
          );
        } else {
          this.logger.log(
            `📝 Updating claimed device in database (preserving claim): ${deviceData.id}`
          );
        }

        await deviceRepository.update(deviceData.id, updateData);
      } else {
        // Create new device using repository directly
        const deviceRepository = this.devicesService["deviceRepository"];
        const newDevice = deviceRepository.create({
          id: deviceData.id,
          name: `PalPalette-${deviceData.id.substring(0, 8)}`,
          type: "esp32c3",
          macAddress: deviceData.macAddress,
          ipAddress: deviceData.ipAddress,
          firmwareVersion: deviceData.firmwareVersion,
          isProvisioned: deviceData.isProvisioned || false,
          pairingCode: deviceData.pairingCode,
          status: "online",
          isOnline: true,
          lastSeenAt: new Date(),
          user: null, // Will be set when user claims the device
        });
        await deviceRepository.save(newDevice);
        this.logger.log(`🆕 Created new device in database: ${deviceData.id}`);
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to ensure device in database: ${error.message}`
      );
      throw error;
    }
  }
}
