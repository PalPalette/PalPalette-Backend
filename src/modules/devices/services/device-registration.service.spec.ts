import { Test, TestingModule } from "@nestjs/testing";
import { DeviceRegistrationService } from "./device-registration.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Device } from "../entities/device.entity";
import { Repository } from "typeorm";
import { ConflictException } from "@nestjs/common";
import { RegisterDeviceDto } from "../dto/device-pairing/register-device.dto";
import { UpdateStatusDto } from "../dto/device-pairing/update-status.dto";

const mockDevice = {
  id: "test-device-id",
  name: "Test Device",
  type: "esp32",
  status: "unclaimed",
  macAddress: "AA:BB:CC:DD:EE:FF",
  pairingCode: "123456",
  pairingCodeExpiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
  user: null,
  isProvisioned: false,
  isOnline: true,
  lastSeenAt: new Date(),
  ipAddress: "192.168.1.100",
  firmwareVersion: "1.0.0",
  lightingSystemType: "nanoleaf",
  lightingHostAddress: "192.168.1.101",
  lightingPort: 16021,
  lightingAuthToken: null,
  lightingCustomConfig: null,
  lightingSystemConfigured: false,
  lightingLastTestAt: null,
  lightingStatus: "unknown",
  createdAt: new Date(),
  updatedAt: new Date(),
  messages: [],
} as Device;

describe("DeviceRegistrationService", () => {
  let service: DeviceRegistrationService;
  let deviceRepo: Repository<Device>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceRegistrationService,
        {
          provide: getRepositoryToken(Device),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn().mockReturnValue(mockDevice),
            save: jest.fn().mockResolvedValue(mockDevice),
            find: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<DeviceRegistrationService>(DeviceRegistrationService);
    deviceRepo = module.get<Repository<Device>>(getRepositoryToken(Device));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("registerDevice", () => {
    it("should register a new device successfully", async () => {
      const registerDto: RegisterDeviceDto = {
        macAddress: "AA:BB:CC:DD:EE:FF",
        ipAddress: "192.168.1.100",
        deviceType: "esp32",
        firmwareVersion: "1.0.0",
        lightingSystemType: "nanoleaf",
        lightingHostAddress: "192.168.1.101",
        lightingPort: 16021,
      };

      jest.spyOn(deviceRepo, "findOne").mockResolvedValueOnce(null); // Device doesn't exist
      jest.spyOn(Math, "random").mockReturnValue(0.123456); // Mock random for consistent pairing code

      const result = await service.registerDevice(registerDto);

      expect(result).toHaveProperty("device");
      expect(result).toHaveProperty("pairingCode");
      expect(result.device).toEqual(mockDevice);
      expect(result.pairingCode).toMatch(/^\d{6}$/); // 6-digit code
      expect(deviceRepo.findOne).toHaveBeenCalledWith({
        where: { macAddress: registerDto.macAddress },
      });
      expect(deviceRepo.create).toHaveBeenCalled();
      expect(deviceRepo.save).toHaveBeenCalled();
    });

    it("should throw ConflictException if device already exists", async () => {
      const registerDto: RegisterDeviceDto = {
        macAddress: "AA:BB:CC:DD:EE:FF",
        ipAddress: "192.168.1.100",
        deviceType: "esp32",
      };

      jest.spyOn(deviceRepo, "findOne").mockResolvedValueOnce(mockDevice);

      await expect(service.registerDevice(registerDto)).rejects.toThrow(
        ConflictException
      );
      expect(deviceRepo.findOne).toHaveBeenCalledWith({
        where: { macAddress: registerDto.macAddress },
      });
    });

    it("should generate unique pairing codes", async () => {
      const registerDto: RegisterDeviceDto = {
        macAddress: "AA:BB:CC:DD:EE:FF",
        ipAddress: "192.168.1.100",
        deviceType: "esp32",
      };

      jest.spyOn(deviceRepo, "findOne").mockResolvedValue(null);
      jest.spyOn(deviceRepo, "find").mockResolvedValueOnce([]); // No existing codes

      const result = await service.registerDevice(registerDto);

      expect(result.pairingCode).toMatch(/^\d{6}$/);
      expect(deviceRepo.find).toHaveBeenCalledWith({
        where: { pairingCode: result.pairingCode },
      });
    });
  });

  describe("updateDeviceStatus", () => {
    it("should update device status successfully", async () => {
      const updateDto: UpdateStatusDto = {
        status: "online",
        ipAddress: "192.168.1.101",
      };

      jest.spyOn(deviceRepo, "findOne").mockResolvedValueOnce(mockDevice);
      const updatedDevice = { ...mockDevice, ...updateDto };
      jest.spyOn(deviceRepo, "save").mockResolvedValueOnce(updatedDevice);

      const result = await service.updateDeviceStatus(
        "test-device-id",
        updateDto
      );

      expect(result).toEqual(updatedDevice);
      expect(deviceRepo.findOne).toHaveBeenCalledWith({
        where: { id: "test-device-id" },
      });
      expect(deviceRepo.save).toHaveBeenCalledWith({
        ...mockDevice,
        ...updateDto,
        lastSeenAt: expect.any(Date),
      });
    });

    it("should throw NotFoundException if device does not exist", async () => {
      const updateDto: UpdateStatusDto = {
        status: "online",
      };

      jest.spyOn(deviceRepo, "findOne").mockResolvedValueOnce(null);

      await expect(
        service.updateDeviceStatus("nonexistent-id", updateDto)
      ).rejects.toThrow("Device not found");
    });
  });

  describe("findUnclaimedDevices", () => {
    it("should return unclaimed devices", async () => {
      const unclaimedDevices = [mockDevice];
      jest.spyOn(deviceRepo, "find").mockResolvedValueOnce(unclaimedDevices);

      const result = await service.findUnclaimedDevices();

      expect(result).toEqual(unclaimedDevices);
      expect(deviceRepo.find).toHaveBeenCalledWith({
        where: { user: null },
        order: { createdAt: "DESC" },
      });
    });
  });
});
