import { Device } from "../modules/devices/entities/device.entity";
import { User } from "../modules/users/entities/user.entity";
import {
  Message,
  MessageStatus,
} from "../modules/messages/entities/message.entity";
import * as crypto from "crypto";

export class TestFixtures {
  static createUser(overrides: Partial<User> = {}): User {
    const user = new User();
    user.id = overrides.id || "test-user-id";
    user.email = overrides.email || "test@example.com";
    user.passwordHash = overrides.passwordHash || "$2b$10$hashedpassword";
    user.displayName = overrides.displayName || "Test User";
    user.createdAt = overrides.createdAt || new Date();
    user.updatedAt = overrides.updatedAt || new Date();
    user.devices = overrides.devices || [];
    return user;
  }

  static createDevice(overrides: Partial<Device> = {}): Device {
    const device = new Device();
    device.id = overrides.id || "test-device-id";
    device.name = overrides.name || "Test Device";
    device.type = overrides.type || "esp32";
    device.status = overrides.status || "unclaimed";
    device.macAddress = overrides.macAddress || "AA:BB:CC:DD:EE:FF";
    device.pairingCode = overrides.pairingCode || "ABC123";
    device.pairingCodeExpiresAt =
      overrides.pairingCodeExpiresAt || new Date(Date.now() + 30 * 60 * 1000);
    device.isProvisioned = overrides.isProvisioned ?? true;
    device.isOnline = overrides.isOnline ?? false;
    device.ipAddress = overrides.ipAddress || null;
    device.lastSeenAt = overrides.lastSeenAt || null;
    device.createdAt = overrides.createdAt || new Date();
    device.updatedAt = overrides.updatedAt || new Date();
    device.user = overrides.user || null;
    device.messages = overrides.messages || [];
    return device;
  }

  static createMessage(overrides: Partial<Message> = {}): Message {
    const message = new Message();
    message.id = overrides.id || "test-message-id";
    message.colors = overrides.colors || ["#ff0000", "#00ff00", "#0000ff"];
    message.imageUrl = overrides.imageUrl || null;
    message.sentAt = overrides.sentAt || new Date();
    message.deliveredAt = overrides.deliveredAt || null;
    message.status = overrides.status || MessageStatus.SENT;
    message.sender = overrides.sender || null;
    message.recipient = overrides.recipient || null;
    message.device = overrides.device || null;
    return message;
  }

  // Create complete setup scenarios
  static createDeviceSetupScenario() {
    const user = this.createUser({
      id: "setup-user-id",
      email: "setup@example.com",
      displayName: "Setup User",
    });

    const unclaimedDevice = this.createDevice({
      id: "unclaimed-device-id",
      name: "Unclaimed Device",
      pairingCode: "ABC123",
      status: "unclaimed",
      user: null,
      macAddress: "AA:BB:CC:DD:EE:01",
    });

    const claimedDevice = this.createDevice({
      id: "claimed-device-id",
      name: "Living Room Light",
      status: "claimed",
      user: user,
      macAddress: "AA:BB:CC:DD:EE:02",
      pairingCode: null,
      pairingCodeExpiresAt: null,
    });

    const completedDevice = this.createDevice({
      id: "completed-device-id",
      name: "Kitchen Light",
      status: "online",
      user: user,
      isProvisioned: true,
      isOnline: true,
      ipAddress: "192.168.1.100",
      macAddress: "AA:BB:CC:DD:EE:03",
      lastSeenAt: new Date(),
      pairingCode: null,
      pairingCodeExpiresAt: null,
    });

    return {
      user,
      unclaimedDevice,
      claimedDevice,
      completedDevice,
    };
  }

  // Create expired setup token scenario
  static createExpiredTokenScenario() {
    const user = this.createUser({
      id: "expired-user-id",
      email: "expired@example.com",
    });

    const deviceWithExpiredToken = this.createDevice({
      id: "expired-device-id",
      name: "Expired Device",
      status: "unclaimed",
      user: null,
      macAddress: "AA:BB:CC:DD:EE:04",
      pairingCode: "XYZ789",
      pairingCodeExpiresAt: new Date(Date.now() - 60 * 1000), // 1 minute ago (expired)
    });

    return {
      user,
      deviceWithExpiredToken,
    };
  }
}
