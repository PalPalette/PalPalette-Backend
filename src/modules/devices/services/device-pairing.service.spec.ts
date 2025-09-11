import { Test, TestingModule } from "@nestjs/testing";
import { DevicePairingService } from "./device-pairing.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Device } from "../entities/device.entity";
import { User } from "../../users/entities/user.entity";
import { Repository } from "typeorm";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { ClaimByCodeDto } from "../dto/device-pairing/claim-by-code.dto";
import { DeviceWebSocketService } from "../../messages/device-websocket.service";

describe("DevicePairingService", () => {
  let service: DevicePairingService;
  let deviceRepo: Repository<Device>;
  let userRepo: Repository<User>;
  let webSocketService: DeviceWebSocketService;

  const mockUser = {
    id: "user-id",
    email: "test@example.com",
    displayName: "Test User",
  } as User;

  const mockDevice = {
    id: "device-id",
    name: "Test Device",
    pairingCode: "123456",
    pairingCodeExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
    user: null,
    status: "unclaimed",
  } as Device;

  const mockClaimedDevice = {
    ...mockDevice,
    user: mockUser,
    status: "claimed",
  } as Device;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicePairingService,
        {
          provide: getRepositoryToken(Device),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockUser),
          },
        },
        {
          provide: DeviceWebSocketService,
          useValue: {
            notifyUserActionRequired: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DevicePairingService>(DevicePairingService);
    deviceRepo = module.get<Repository<Device>>(getRepositoryToken(Device));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    webSocketService = module.get<DeviceWebSocketService>(
      DeviceWebSocketService
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("claimDeviceByCode", () => {
    it("should claim a device successfully", async () => {
      const claimDto: ClaimByCodeDto = {
        pairingCode: "123456",
        deviceName: "My Device",
      };

      jest.spyOn(deviceRepo, "findOne").mockResolvedValueOnce(mockDevice);
      jest.spyOn(deviceRepo, "save").mockResolvedValueOnce(mockClaimedDevice);

      const result = await service.claimDeviceByCode("user-id", claimDto);

      expect(result).toEqual(mockClaimedDevice);
      expect(deviceRepo.findOne).toHaveBeenCalledWith({
        where: { pairingCode: claimDto.pairingCode },
        relations: ["user"],
      });
      expect(deviceRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException for invalid pairing code", async () => {
      const claimDto: ClaimByCodeDto = {
        pairingCode: "invalid",
        deviceName: "My Device",
      };

      jest.spyOn(deviceRepo, "findOne").mockResolvedValueOnce(null);

      await expect(
        service.claimDeviceByCode("user-id", claimDto)
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for expired pairing code", async () => {
      const expiredDevice = {
        ...mockDevice,
        pairingCodeExpiresAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
      } as Device;

      const claimDto: ClaimByCodeDto = {
        pairingCode: "123456",
        deviceName: "My Device",
      };

      jest.spyOn(deviceRepo, "findOne").mockResolvedValueOnce(expiredDevice);

      await expect(
        service.claimDeviceByCode("user-id", claimDto)
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException if device already claimed", async () => {
      const alreadyClaimedDevice = {
        ...mockDevice,
        user: mockUser,
      } as Device;

      const claimDto: ClaimByCodeDto = {
        pairingCode: "123456",
        deviceName: "My Device",
      };

      jest
        .spyOn(deviceRepo, "findOne")
        .mockResolvedValueOnce(alreadyClaimedDevice);

      await expect(
        service.claimDeviceByCode("user-id", claimDto)
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("findUserDevices", () => {
    it("should return devices for a user", async () => {
      const userDevices = [mockClaimedDevice];
      jest.spyOn(deviceRepo, "find").mockResolvedValueOnce(userDevices);

      const result = await service.findUserDevices("user-id");

      expect(result).toEqual(userDevices);
      expect(deviceRepo.find).toHaveBeenCalledWith({
        where: { user: { id: "user-id" } },
        relations: ["user"],
        order: { createdAt: "DESC" },
      });
    });
  });

  describe("getDeviceById", () => {
    it("should return a device by id", async () => {
      jest.spyOn(deviceRepo, "findOne").mockResolvedValueOnce(mockDevice);

      const result = await service.getDeviceById("device-id");

      expect(result).toEqual(mockDevice);
      expect(deviceRepo.findOne).toHaveBeenCalledWith({
        where: { id: "device-id" },
        relations: ["user"],
      });
    });

    it("should throw NotFoundException if device not found", async () => {
      jest.spyOn(deviceRepo, "findOne").mockResolvedValueOnce(null);

      await expect(service.getDeviceById("nonexistent")).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
