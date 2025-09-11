import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { DeviceWebSocketService } from "./device-websocket.service";

@Injectable()
export class MessagesGateway {
  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    @Inject(forwardRef(() => DeviceWebSocketService))
    private readonly deviceWebSocketService: DeviceWebSocketService
  ) {}

  // Send color palette to specific device (only raw WebSocket needed)
  async sendColorPaletteToDevice(deviceId: string, colorPalette: any) {
    const delivered = this.deviceWebSocketService.sendColorPaletteToDevice(
      deviceId,
      colorPalette
    );

    if (delivered) {
      this.logger.log(
        `Color palette sent to device ${deviceId} via Device WebSocket`
      );
    } else {
      this.logger.warn(`Device ${deviceId} not connected`);
    }

    return delivered;
  }

  // Get connected devices
  getConnectedDevices(): string[] {
    return this.deviceWebSocketService.getConnectedDevices();
  }

  // Legacy method for mobile app notifications (now handled via HTTP REST API)
  // Kept as no-op to maintain compatibility
  async sendMessageNotificationToUser(
    userId: string,
    message: any
  ): Promise<boolean> {
    this.logger.debug(
      `sendMessageNotificationToUser called for user ${userId} - now handled via HTTP REST API`
    );
    return true; // Return true to indicate "handled" (even though it's a no-op)
  }

  // Legacy method for new message events (now handled via HTTP REST API)
  // Kept as no-op to maintain compatibility
  async emitNewMessage(message: any): Promise<void> {
    this.logger.debug(
      `emitNewMessage called for message ${message.id} - now handled via HTTP REST API`
    );
    // No-op since mobile apps use HTTP polling/REST API instead of WebSocket
  }
}
