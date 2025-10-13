/* eslint-disable */
// PATCH: Remove passwordHash from User schema and required array
// PATCH: Add devices to FriendDto required array if present in OpenAPI
// This file is auto-generated or used for OpenAPI/Swagger, so ensure your decorators match the intended schema.
export default async () => {
  const t = {
    ["./modules/users/entities/user.entity"]: await import(
      "./modules/users/entities/user.entity"
    ),
    ["./modules/devices/entities/device.entity"]: await import(
      "./modules/devices/entities/device.entity"
    ),
    ["./modules/messages/entities/message.entity"]: await import(
      "./modules/messages/entities/message.entity"
    ),
    ["./modules/users/entities/friendship.entity"]: await import(
      "./modules/users/entities/friendship.entity"
    ),
    ["./modules/devices/dto/notifications/device-notification.dto"]:
      await import(
        "./modules/devices/dto/notifications/device-notification.dto"
      ),
    ["./modules/users/entities/color-palette.entity"]: await import(
      "./modules/users/entities/color-palette.entity"
    ),
    ["./modules/devices/dto/lighting-system/lighting-system.dto"]: await import(
      "./modules/devices/dto/lighting-system/lighting-system.dto"
    ),
    ["./modules/auth/dto/auth-response.dto"]: await import(
      "./modules/auth/dto/auth-response.dto"
    ),
  };
  return {
    "@nestjs/swagger": {
      models: [
        [
          import("./modules/messages/entities/message.entity"),
          {
            Message: {
              id: { required: true, type: () => String },
              sender: {
                required: true,
                type: () => t["./modules/users/entities/user.entity"].User,
              },
              recipient: {
                required: true,
                type: () => t["./modules/users/entities/user.entity"].User,
              },
              device: {
                required: true,
                type: () =>
                  t["./modules/devices/entities/device.entity"].Device,
              },
              colors: { required: true, type: () => [Object] },
              imageUrl: { required: true, type: () => String },
              sentAt: { required: true, type: () => Date },
              deliveredAt: { required: true, type: () => Date },
              status: {
                required: true,
                enum: t["./modules/messages/entities/message.entity"]
                  .MessageStatus,
              },
            },
          },
        ],
        [
          import("./modules/devices/entities/device.entity"),
          {
            Device: {
              id: { required: true, type: () => String },
              name: { required: true, type: () => String },
              type: { required: true, type: () => String },
              user: {
                required: true,
                type: () => t["./modules/users/entities/user.entity"].User,
                nullable: true,
              },
              status: { required: true, type: () => String },
              lastSeenAt: { required: true, type: () => Date },
              pairingCode: { required: true, type: () => String },
              pairingCodeExpiresAt: { required: true, type: () => Date },
              macAddress: { required: true, type: () => String },
              isProvisioned: { required: true, type: () => Boolean },
              isOnline: { required: true, type: () => Boolean },
              ipAddress: { required: true, type: () => String },
              wifiRSSI: { required: true, type: () => Number },
              firmwareVersion: { required: true, type: () => String },
              systemStats: { required: true, type: () => Object },
              lightingSystemType: { required: true, type: () => String },
              lightingHostAddress: { required: true, type: () => String },
              lightingPort: { required: true, type: () => Number },
              lightingAuthToken: { required: true, type: () => String },
              lightingCustomConfig: { required: true, type: () => Object },
              lightingSystemConfigured: { required: true, type: () => Boolean },
              lightingLastTestAt: { required: true, type: () => Date },
              lightingStatus: { required: true, type: () => String },
              lightingCapabilities: { required: true, type: () => Object },
              lightingLastStatusUpdate: { required: true, type: () => Date },
              createdAt: { required: true, type: () => Date },
              updatedAt: { required: true, type: () => Date },
              messages: {
                required: true,
                type: () => [
                  t["./modules/messages/entities/message.entity"].Message,
                ],
              },
            },
          },
        ],
        [
          import("./modules/users/entities/user.entity"),
          {
            User: {
              id: { required: true, type: () => String },
              email: { required: true, type: () => String },
              displayName: { required: true, type: () => String },
              createdAt: { required: true, type: () => Date },
              updatedAt: { required: true, type: () => Date },
              devices: {
                required: true,
                type: () => [
                  t["./modules/devices/entities/device.entity"].Device,
                ],
              },
              sentMessages: {
                required: true,
                type: () => [
                  t["./modules/messages/entities/message.entity"].Message,
                ],
              },
              receivedMessages: {
                required: true,
                type: () => [
                  t["./modules/messages/entities/message.entity"].Message,
                ],
              },
            },
          },
        ],
        [
          import("./modules/users/dto/register-user.dto"),
          {
            RegisterUserDto: {
              email: { required: true, type: () => String, format: "email" },
              password: { required: true, type: () => String, minLength: 6 },
              displayName: { required: true, type: () => String },
            },
          },
        ],
        [
          import("./modules/messages/dto/create-message.dto"),
          {
            CreateMessageDto: {
              senderId: { required: true, type: () => String, format: "uuid" },
              recipientId: {
                required: true,
                type: () => String,
                format: "uuid",
              },
              deviceId: { required: true, type: () => String, format: "uuid" },
              colors: { required: true, type: () => [String], minItems: 1 },
              content: { required: false, type: () => String },
            },
          },
        ],
        [
          import("./modules/devices/dto/device-management/update-device.dto"),
          {
            UpdateDeviceDto: {
              name: { required: false, type: () => String },
              status: { required: false, type: () => String },
              lastSeenAt: { required: false, type: () => Date },
              lightingSystemType: { required: false, type: () => String },
              lightingHostAddress: { required: false, type: () => String },
              lightingPort: { required: false, type: () => Number },
              lightingAuthToken: { required: false, type: () => String },
              lightingCustomConfig: { required: false, type: () => Object },
              lightingSystemConfigured: {
                required: false,
                type: () => Boolean,
              },
              lightingStatus: { required: false, type: () => String },
            },
          },
        ],
        [
          import("./modules/users/entities/friendship.entity"),
          {
            Friendship: {
              id: { required: true, type: () => String },
              requesterId: { required: true, type: () => String },
              addresseeId: { required: true, type: () => String },
              status: {
                required: true,
                enum: t["./modules/users/entities/friendship.entity"]
                  .FriendshipStatus,
              },
              requester: {
                required: true,
                type: () => t["./modules/users/entities/user.entity"].User,
              },
              addressee: {
                required: true,
                type: () => t["./modules/users/entities/user.entity"].User,
              },
              createdAt: { required: true, type: () => Date },
              updatedAt: { required: true, type: () => Date },
            },
          },
        ],
        [
          import("./modules/users/dto/friendship.dto"),
          {
            SendFriendRequestDto: {
              email: { required: true, type: () => String, format: "email" },
            },
            RespondToFriendRequestDto: {
              friendshipId: { required: true, type: () => String },
              action: { required: true, type: () => Object },
            },
          },
        ],
        [
          import("./modules/users/entities/color-palette.entity"),
          {
            ColorPalette: {
              id: { required: true, type: () => String },
              name: { required: true, type: () => String },
              colors: { required: true, type: () => [String] },
              imageUrl: { required: false, type: () => String },
              description: { required: false, type: () => String },
              createdById: { required: true, type: () => String },
              createdBy: {
                required: true,
                type: () => t["./modules/users/entities/user.entity"].User,
              },
              createdAt: { required: true, type: () => Date },
              updatedAt: { required: true, type: () => Date },
            },
          },
        ],
        [
          import("./modules/users/dto/color-palette.dto"),
          {
            CreateColorPaletteDto: {
              name: { required: true, type: () => String },
              colors: {
                required: true,
                type: () => [String],
                pattern:
                  "^#?([0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$",
                minItems: 1,
              },
              description: { required: false, type: () => String },
              imageUrl: { required: false, type: () => String },
            },
            UpdateColorPaletteDto: {
              name: { required: false, type: () => String },
              colors: {
                required: false,
                type: () => [String],
                pattern:
                  "^#?([0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$",
                minItems: 1,
              },
              description: { required: false, type: () => String },
            },
            SendPaletteToFriendsDto: {
              paletteId: { required: false, type: () => String },
              friendIds: { required: true, type: () => [String], minItems: 1 },
              colors: { required: false, type: () => [String], minItems: 1 },
              imageUrl: { required: false, type: () => String },
            },
          },
        ],
        [
          import("./modules/devices/dto/device-pairing/register-device.dto"),
          {
            RegisterDeviceDto: {
              macAddress: {
                required: true,
                type: () => String,
                pattern: "/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/",
              },
              ipAddress: { required: false, type: () => String },
              deviceType: { required: false, type: () => String },
              firmwareVersion: { required: false, type: () => String },
              lightingSystemType: { required: false, type: () => String },
              lightingHostAddress: { required: false, type: () => String },
              lightingPort: { required: false, type: () => Number },
              lightingAuthToken: { required: false, type: () => String },
              lightingCustomConfig: { required: false, type: () => Object },
            },
          },
        ],
        [
          import("./modules/devices/dto/device-pairing/claim-by-code.dto"),
          {
            ClaimByCodeDto: {
              pairingCode: {
                required: true,
                type: () => String,
                minLength: 6,
                maxLength: 6,
              },
              deviceName: { required: true, type: () => String },
            },
          },
        ],
        [
          import("./modules/devices/dto/device-pairing/update-status.dto"),
          {
            UpdateStatusDto: {
              isOnline: { required: false, type: () => Boolean },
              isProvisioned: { required: false, type: () => Boolean },
              ipAddress: { required: false, type: () => String },
              lastSeenAt: { required: false, type: () => String },
              firmwareVersion: { required: false, type: () => String },
              macAddress: { required: false, type: () => String },
              wifiRSSI: { required: false, type: () => Number },
              systemStats: {
                required: false,
                type: () => ({
                  freeHeap: { required: false, type: () => Number },
                  uptime: { required: false, type: () => Number },
                  lastUpdate: { required: false, type: () => Date },
                }),
              },
            },
          },
        ],
        [
          import("./modules/devices/dto/lighting-system/lighting-system.dto"),
          {
            LightingSystemConfigDto: {
              lightingSystemType: { required: true, type: () => String },
              lightingHostAddress: { required: false, type: () => String },
              lightingPort: { required: false, type: () => Number },
              lightingAuthToken: { required: false, type: () => String },
              lightingCustomConfig: { required: false, type: () => Object },
            },
            UpdateLightingSystemDto: {
              lightingSystemType: { required: false, type: () => String },
              lightingHostAddress: { required: false, type: () => String },
              lightingPort: { required: false, type: () => Number },
              lightingAuthToken: { required: false, type: () => String },
              lightingCustomConfig: { required: false, type: () => Object },
              lightingSystemConfigured: {
                required: false,
                type: () => Boolean,
              },
              lightingStatus: { required: false, type: () => String },
            },
            TestLightingSystemDto: {
              deviceId: { required: true, type: () => String },
            },
            LightingSystemStatusDto: {
              lightingSystemType: { required: true, type: () => String },
              lightingHostAddress: { required: false, type: () => String },
              lightingPort: { required: false, type: () => Number },
              lightingSystemConfigured: { required: true, type: () => Boolean },
              lightingStatus: { required: true, type: () => String },
              lightingLastTestAt: { required: false, type: () => Date },
              requiresAuthentication: { required: true, type: () => Boolean },
              capabilities: { required: false, type: () => Object },
            },
          },
        ],
        [
          import("./modules/devices/dto/notifications/device-notification.dto"),
          {
            UserNotificationDto: {
              deviceId: { required: true, type: () => String },
              action: {
                required: true,
                enum: t[
                  "./modules/devices/dto/notifications/device-notification.dto"
                ].NotificationAction,
              },
              message: { required: true, type: () => String },
              instructions: { required: false, type: () => String },
              pairingCode: { required: false, type: () => String },
              timeout: { required: false, type: () => Number },
              timestamp: { required: false, type: () => Number },
              additionalData: { required: false, type: () => Object },
            },
            NotificationResponseDto: {
              notificationId: { required: true, type: () => String },
              status: { required: true, type: () => Object },
              message: { required: true, type: () => String },
            },
            LightingAuthenticationProgressDto: {
              deviceId: { required: true, type: () => String },
              action: {
                required: true,
                enum: t[
                  "./modules/devices/dto/notifications/device-notification.dto"
                ].NotificationAction,
              },
              instructions: { required: true, type: () => String },
              remainingTime: { required: true, type: () => Number },
              timestamp: { required: false, type: () => Number },
            },
          },
        ],
        [
          import("./modules/auth/dto/login-request.dto"),
          {
            LoginRequestDto: {
              email: { required: true, type: () => String, format: "email" },
              password: { required: true, type: () => String, minLength: 6 },
              device_name: { required: false, type: () => String },
            },
          },
        ],
        [
          import("./modules/auth/dto/auth-response.dto"),
          {
            AuthResponseDto: {
              access_token: { required: true, type: () => String },
              refresh_token: { required: true, type: () => String },
              token_type: {
                required: true,
                type: () => String,
                default: "Bearer",
              },
              expires_in: { required: true, type: () => Number },
              user: {
                required: true,
                type: () => ({
                  id: { required: true, type: () => String },
                  email: { required: true, type: () => String },
                  displayName: { required: true, type: () => String },
                }),
              },
            },
          },
        ],
        [
          import("./modules/auth/entities/refresh-token.entity"),
          {
            RefreshToken: {
              id: { required: true, type: () => String },
              token: { required: true, type: () => String },
              userId: { required: true, type: () => String },
              user: {
                required: true,
                type: () => t["./modules/users/entities/user.entity"].User,
              },
              deviceName: { required: false, type: () => String },
              deviceFingerprint: { required: false, type: () => String },
              ipAddress: { required: false, type: () => String },
              userAgent: { required: false, type: () => String },
              expiresAt: { required: true, type: () => Date },
              isRevoked: { required: true, type: () => Boolean },
              lastUsedAt: { required: false, type: () => Date },
              createdAt: { required: true, type: () => Date },
              updatedAt: { required: true, type: () => Date },
              deletedAt: { required: false, type: () => Date },
            },
          },
        ],
        [
          import("./modules/auth/dto/refresh-token.dto"),
          {
            RefreshTokenDto: {
              refresh_token: { required: true, type: () => String },
            },
          },
        ],
        [
          import("./modules/auth/dto/validate-token.dto"),
          {
            ValidateTokenDto: { token: { required: true, type: () => String } },
          },
        ],
        [
          import("./modules/users/dto/login-user.dto"),
          {
            LoginUserDto: {
              email: { required: true, type: () => String, format: "email" },
              password: { required: true, type: () => String, minLength: 6 },
            },
          },
        ],
      ],
      controllers: [
        [
          import("./modules/users/users.controller"),
          {
            UsersController: {
              register: {
                type: t["./modules/users/entities/user.entity"].User,
              },
              sendFriendRequest: {
                type: t["./modules/users/entities/friendship.entity"]
                  .Friendship,
              },
              respondToFriendRequest: {
                type: t["./modules/users/entities/friendship.entity"]
                  .Friendship,
              },
              getFriends: {
                type: [t["./modules/users/entities/user.entity"].User],
              },
              getPendingRequests: {
                type: [
                  t["./modules/users/entities/friendship.entity"].Friendship,
                ],
              },
              getSentRequests: {
                type: [
                  t["./modules/users/entities/friendship.entity"].Friendship,
                ],
              },
              createPalette: {
                type: t["./modules/users/entities/color-palette.entity"]
                  .ColorPalette,
              },
              getUserPalettes: {
                type: [
                  t["./modules/users/entities/color-palette.entity"]
                    .ColorPalette,
                ],
              },
              sendPaletteToFriends: {
                type: [t["./modules/messages/entities/message.entity"].Message],
              },
              getPalette: {
                type: t["./modules/users/entities/color-palette.entity"]
                  .ColorPalette,
              },
              updatePalette: {
                type: t["./modules/users/entities/color-palette.entity"]
                  .ColorPalette,
              },
              deletePalette: {},
              getReceivedMessages: {
                type: [t["./modules/messages/entities/message.entity"].Message],
              },
              getUndeliveredMessages: {
                type: [t["./modules/messages/entities/message.entity"].Message],
              },
              replayMessage: {},
              getUser: { type: t["./modules/users/entities/user.entity"].User },
              updateProfile: {
                type: t["./modules/users/entities/user.entity"].User,
              },
              remove: {},
            },
          },
        ],
        [
          import("./modules/messages/messages.controller"),
          {
            MessagesController: {
              create: {
                type: t["./modules/messages/entities/message.entity"].Message,
              },
              findAll: {
                type: [t["./modules/messages/entities/message.entity"].Message],
              },
              findById: {
                type: t["./modules/messages/entities/message.entity"].Message,
              },
              findByRecipient: {
                type: [t["./modules/messages/entities/message.entity"].Message],
              },
            },
          },
        ],
        [
          import("./modules/devices/devices.controller"),
          {
            DevicesController: {
              registerDevice: {},
              getPairingCode: {},
              claimByCode: {
                type: t["./modules/devices/entities/device.entity"].Device,
              },
              resetDevice: {},
              updateStatus: {
                type: t["./modules/devices/entities/device.entity"].Device,
              },
              findDeviceByMacAddress: {
                type: t["./modules/devices/entities/device.entity"].Device,
              },
              discoverUnpairedDevices: {},
              debugAllDevices: {},
              getDevicePairingInfo: {},
              configureLightingSystem: {
                type: t["./modules/devices/entities/device.entity"].Device,
              },
              updateLightingSystem: {
                type: t["./modules/devices/entities/device.entity"].Device,
              },
              testLightingSystem: {},
              getLightingSystemStatus: {
                type: t[
                  "./modules/devices/dto/lighting-system/lighting-system.dto"
                ].LightingSystemStatusDto,
              },
              resetLightingSystem: {
                type: t["./modules/devices/entities/device.entity"].Device,
              },
              sendUserNotification: {
                type: t[
                  "./modules/devices/dto/notifications/device-notification.dto"
                ].NotificationResponseDto,
              },
              getMyDevicesLightingSystems: {
                type: [
                  t["./modules/devices/dto/lighting-system/lighting-system.dto"]
                    .LightingSystemStatusDto,
                ],
              },
              getSupportedLightingSystems: {},
              getDefaultLightingConfig: { type: Object },
              getMyDevices: {
                type: [t["./modules/devices/entities/device.entity"].Device],
              },
              findAll: {
                type: [t["./modules/devices/entities/device.entity"].Device],
              },
              findOne: {
                type: t["./modules/devices/entities/device.entity"].Device,
              },
              update: {
                type: t["./modules/devices/entities/device.entity"].Device,
              },
              remove: {},
            },
          },
        ],
        [
          import("./modules/auth/auth.controller"),
          {
            AuthController: {
              register: {
                type: t["./modules/users/entities/user.entity"].User,
              },
              login: {
                type: t["./modules/auth/dto/auth-response.dto"].AuthResponseDto,
              },
              refresh: {
                type: t["./modules/auth/dto/auth-response.dto"].AuthResponseDto,
              },
              logout: {},
              validate: {},
              revokeDevice: {},
              getActiveSessions: {},
            },
          },
        ],
      ],
    },
  };
};
