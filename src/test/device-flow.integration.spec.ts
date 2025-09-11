import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import * as request from "supertest";
import { DevicesController } from "../modules/devices/devices.controller";
import { DeviceRegistrationService } from "../modules/devices/services/device-registration.service";
import { DevicePairingService } from "../modules/devices/services/device-pairing.service";
import { LightingSystemsService } from "../modules/devices/lighting-systems.service";
import { DeviceWebSocketService } from "../modules/messages/device-websocket.service";
import { Device } from "../modules/devices/entities/device.entity";
import { User } from "../modules/users/entities/user.entity";
import { DataSource } from "typeorm";
import { JwtModule, JwtService } from "@nestjs/jwt";

describe("Device Flow Integration Tests", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let deviceRegistrationService: DeviceRegistrationService;
  let devicePairingService: DevicePairingService;
  let jwtService: JwtService;
  let testUser: User;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "sqlite",
          database: ":memory:",
          entities: [Device, User],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Device, User]),
        JwtModule.register({
          secret: "test-secret",
          signOptions: { expiresIn: "1h" },
        }),
      ],
      controllers: [DevicesController],
      providers: [
        DeviceRegistrationService,
        DevicePairingService,
        LightingSystemsService,
        {
          provide: DeviceWebSocketService,
          useValue: {
            notifyUserActionRequired: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    deviceRegistrationService = moduleFixture.get<DeviceRegistrationService>(
      DeviceRegistrationService
    );
    devicePairingService =
      moduleFixture.get<DevicePairingService>(DevicePairingService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create a test user
    const userRepo = dataSource.getRepository(User);
    testUser = userRepo.create({
      email: "test@example.com",
      passwordHash: "hashedpassword",
      displayName: "Test User",
    });
    testUser = await userRepo.save(testUser);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clear devices before each test
    const deviceRepo = dataSource.getRepository(Device);
    await deviceRepo.clear();
  });

  describe("Complete Device Setup Flow", () => {
    it("should register device -> claim device -> configure lighting system", async () => {
      // Step 1: Device Registration (simulating ESP32 calling the endpoint)
      const registrationResult = await deviceRegistrationService.registerDevice(
        {
          macAddress: "AA:BB:CC:DD:EE:FF",
          ipAddress: "192.168.1.100",
          deviceType: "esp32",
          firmwareVersion: "1.0.0",
        }
      );

      expect(registrationResult).toHaveProperty("device");
      expect(registrationResult).toHaveProperty("pairingCode");
      expect(registrationResult.device.status).toBe("unclaimed");
      expect(registrationResult.pairingCode).toMatch(/^\d{6}$/);

      const { device: registeredDevice, pairingCode } = registrationResult;

      // Step 2: Device Claiming (simulating user in mobile app)
      const claimedDevice = await devicePairingService.claimDeviceByCode(
        testUser.id,
        {
          pairingCode: pairingCode,
          deviceName: "My Test Device",
        }
      );

      expect(claimedDevice.status).toBe("claimed");
      expect(claimedDevice.user.id).toBe(testUser.id);
      expect(claimedDevice.name).toBe("My Test Device");

      // Step 3: Lighting System Configuration
      const lightingSystemsService = app.get<LightingSystemsService>(
        LightingSystemsService
      );
      const configuredDevice =
        await lightingSystemsService.configureLightingSystem(
          claimedDevice.id,
          testUser.id,
          {
            lightingSystemType: "nanoleaf",
            lightingHostAddress: "192.168.1.101",
            lightingPort: 16021,
            lightingCustomConfig: {
              panelCount: 12,
              brightness: 50,
            },
          }
        );

      expect(configuredDevice.lightingSystemType).toBe("nanoleaf");
      expect(configuredDevice.lightingHostAddress).toBe("192.168.1.101");
      expect(configuredDevice.lightingPort).toBe(16021);
      expect(configuredDevice.lightingSystemConfigured).toBe(true);
    });

    it("should handle device registration with existing MAC address", async () => {
      // Register device first time
      await deviceRegistrationService.registerDevice({
        macAddress: "BB:BB:CC:DD:EE:FF",
        ipAddress: "192.168.1.100",
        deviceType: "esp32",
      });

      // Try to register same device again
      await expect(
        deviceRegistrationService.registerDevice({
          macAddress: "BB:BB:CC:DD:EE:FF",
          ipAddress: "192.168.1.100",
          deviceType: "esp32",
        })
      ).rejects.toThrow("Device with this MAC address already exists");
    });

    it("should handle invalid pairing code", async () => {
      await expect(
        devicePairingService.claimDeviceByCode(testUser.id, {
          pairingCode: "999999",
          deviceName: "Invalid Device",
        })
      ).rejects.toThrow("Invalid pairing code");
    });

    it("should handle expired pairing code", async () => {
      // Create a device with expired pairing code
      const deviceRepo = dataSource.getRepository(Device);
      const expiredDevice = deviceRepo.create({
        name: "Expired Device",
        type: "esp32",
        macAddress: "CC:CC:CC:DD:EE:FF",
        pairingCode: "123456",
        pairingCodeExpiresAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
        status: "unclaimed",
        isProvisioned: false,
        isOnline: false,
        lightingSystemType: "ws2812",
        lightingSystemConfigured: false,
        lightingStatus: "unknown",
      });
      await deviceRepo.save(expiredDevice);

      await expect(
        devicePairingService.claimDeviceByCode(testUser.id, {
          pairingCode: "123456",
          deviceName: "Expired Device",
        })
      ).rejects.toThrow("Pairing code has expired");
    });
  });

  describe("Device HTTP Endpoints", () => {
    it("POST /devices/register should register a new device", async () => {
      const response = await request(app.getHttpServer())
        .post("/devices/register")
        .send({
          macAddress: "DD:DD:CC:DD:EE:FF",
          ipAddress: "192.168.1.100",
          deviceType: "esp32",
          firmwareVersion: "1.0.0",
        })
        .expect(201);

      expect(response.body).toHaveProperty("device");
      expect(response.body).toHaveProperty("pairingCode");
      expect(response.body.device.status).toBe("unclaimed");
    });

    it("POST /devices/claim should claim a device with valid pairing code", async () => {
      // First register a device
      const registrationResult = await deviceRegistrationService.registerDevice(
        {
          macAddress: "EE:EE:CC:DD:EE:FF",
          ipAddress: "192.168.1.100",
          deviceType: "esp32",
        }
      );

      // Generate JWT token for the test user
      const token = jwtService.sign({
        userId: testUser.id,
        email: testUser.email,
      });

      const response = await request(app.getHttpServer())
        .post("/devices/claim")
        .set("Authorization", `Bearer ${token}`)
        .send({
          pairingCode: registrationResult.pairingCode,
          deviceName: "HTTP Test Device",
        })
        .expect(201);

      expect(response.body.status).toBe("claimed");
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.name).toBe("HTTP Test Device");
    });
  });
});
