import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "../../src/modules/users/users.service";
import { ColorPalettesService } from "../../src/modules/users/color-palettes.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "../../src/modules/users/entities/user.entity";
import { ColorPalette } from "../../src/modules/users/entities/color-palette.entity";
import { Message } from "../../src/modules/messages/entities/message.entity";
import { Device } from "../../src/modules/devices/entities/device.entity";
import { Repository } from "typeorm";
import { TestFixtures } from "./fixtures";
import { MessagesService } from "../../src/modules/messages/messages.service";
import { MessagesGateway } from "../../src/modules/messages/messages.gateway";
import { FriendsService } from "../../src/modules/users/friends.service";

describe("Message Timeframe Feature", () => {
  let usersService: UsersService;
  let colorPalettesService: ColorPalettesService;
  let userRepository: Repository<User>;

  const mockUserRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  };

  const mockMessageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockDeviceRepository = {
    find: jest.fn(),
  };

  const mockPaletteRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockMessagesService = {
    getRecentMessages: jest.fn(),
    findUndeliveredMessages: jest.fn(),
    findById: jest.fn(),
  };

  const mockMessagesGateway = {
    sendColorPaletteToDevice: jest.fn(),
    sendMessageNotificationToUser: jest.fn(),
  };

  const mockFriendsService = {
    getFriends: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        ColorPalettesService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepository,
        },
        {
          provide: getRepositoryToken(Device),
          useValue: mockDeviceRepository,
        },
        {
          provide: getRepositoryToken(ColorPalette),
          useValue: mockPaletteRepository,
        },
        {
          provide: MessagesService,
          useValue: mockMessagesService,
        },
        {
          provide: MessagesGateway,
          useValue: mockMessagesGateway,
        },
        {
          provide: FriendsService,
          useValue: mockFriendsService,
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    colorPalettesService =
      module.get<ColorPalettesService>(ColorPalettesService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("setMessageTimeframe", () => {
    it("should successfully set message timeframe", async () => {
      const userId = "test-user-id";
      const dto = {
        messageStartTime: "09:00",
        messageEndTime: "22:00",
      };

      mockUserRepository.update.mockResolvedValue({});
      mockUserRepository.findOne.mockResolvedValue({
        messageStartTime: "09:00:00",
        messageEndTime: "22:00:00",
      });

      const result = await usersService.setMessageTimeframe(userId, dto);

      expect(result).toEqual({
        messageStartTime: "09:00",
        messageEndTime: "22:00",
        isConfigured: true,
      });

      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        messageStartTime: "09:00:00",
        messageEndTime: "22:00:00",
      });
    });

    it("should throw error if only start time is provided", async () => {
      const userId = "test-user-id";
      const dto = {
        messageStartTime: "09:00",
      };

      await expect(
        usersService.setMessageTimeframe(userId, dto)
      ).rejects.toThrow(
        "Both start and end times must be provided together, or both cleared"
      );
    });

    it("should throw error if start time is after end time", async () => {
      const userId = "test-user-id";
      const dto = {
        messageStartTime: "22:00",
        messageEndTime: "09:00",
      };

      await expect(
        usersService.setMessageTimeframe(userId, dto)
      ).rejects.toThrow("Start time must be before end time");
    });
  });

  describe("isWithinMessagingTimeframe", () => {
    it("should return true when no timeframe is configured", () => {
      const user = TestFixtures.createUser({
        messageStartTime: undefined,
        messageEndTime: undefined,
      });

      const result = usersService.isWithinMessagingTimeframe(user);
      expect(result).toBe(true);
    });

    it("should return true when current time is within timeframe", () => {
      // Mock current time to be 15:00 (3 PM)
      const mockDate = new Date("2025-01-01T15:00:00Z");
      jest.spyOn(global, "Date").mockImplementation(() => mockDate);

      const user = TestFixtures.createUser({
        messageStartTime: "09:00:00",
        messageEndTime: "22:00:00",
      });

      const result = usersService.isWithinMessagingTimeframe(user);
      expect(result).toBe(true);

      // Restore Date
      jest.restoreAllMocks();
    });

    it("should return false when current time is outside timeframe", () => {
      // Mock current time to be 02:00 (2 AM)
      const mockDate = new Date("2025-01-01T02:00:00Z");
      jest.spyOn(global, "Date").mockImplementation(() => mockDate);

      const user = TestFixtures.createUser({
        messageStartTime: "09:00:00",
        messageEndTime: "22:00:00",
      });

      const result = usersService.isWithinMessagingTimeframe(user);
      expect(result).toBe(false);

      // Restore Date
      jest.restoreAllMocks();
    });
  });

  describe("Message sending with timeframe", () => {
    it("should send to devices when recipient is within timeframe", async () => {
      const sender = TestFixtures.createUser({ id: "sender-id" });
      const recipient = TestFixtures.createUser({
        id: "recipient-id",
        messageStartTime: "09:00:00",
        messageEndTime: "22:00:00",
      });

      // Mock current time to be 15:00 (3 PM)
      const mockDate = new Date("2025-01-01T15:00:00Z");
      jest.spyOn(global, "Date").mockImplementation(() => mockDate);

      mockFriendsService.getFriends.mockResolvedValue([recipient]);
      mockUserRepository.findOne
        .mockResolvedValueOnce(sender) // for sender lookup
        .mockResolvedValueOnce(recipient); // for recipient lookup
      mockMessageRepository.create.mockReturnValue({ id: "message-id" });
      mockMessageRepository.save.mockResolvedValue({
        id: "message-id",
        colors: [{ hex: "#FF0000" }],
        sentAt: new Date(),
      });
      mockDeviceRepository.find.mockResolvedValue([
        { id: "device-id", user: recipient },
      ]);
      mockMessagesGateway.sendColorPaletteToDevice.mockResolvedValue(true);

      await colorPalettesService.sendDirectColorPalette("sender-id", {
        friendIds: ["recipient-id"],
        colors: ["#FF0000"],
      });

      expect(mockMessagesGateway.sendColorPaletteToDevice).toHaveBeenCalled();

      // Restore Date
      jest.restoreAllMocks();
    });

    it("should not send to devices when recipient is outside timeframe", async () => {
      const sender = TestFixtures.createUser({ id: "sender-id" });
      const recipient = TestFixtures.createUser({
        id: "recipient-id",
        messageStartTime: "09:00:00",
        messageEndTime: "22:00:00",
      });

      // Mock current time to be 02:00 (2 AM)
      const mockDate = new Date("2025-01-01T02:00:00Z");
      jest.spyOn(global, "Date").mockImplementation(() => mockDate);

      mockFriendsService.getFriends.mockResolvedValue([recipient]);
      mockUserRepository.findOne
        .mockResolvedValueOnce(sender) // for sender lookup
        .mockResolvedValueOnce(recipient); // for recipient lookup
      mockMessageRepository.create.mockReturnValue({ id: "message-id" });
      mockMessageRepository.save.mockResolvedValue({
        id: "message-id",
        colors: [{ hex: "#FF0000" }],
        sentAt: new Date(),
      });

      await colorPalettesService.sendDirectColorPalette("sender-id", {
        friendIds: ["recipient-id"],
        colors: ["#FF0000"],
      });

      expect(
        mockMessagesGateway.sendColorPaletteToDevice
      ).not.toHaveBeenCalled();
      expect(mockMessageRepository.save).toHaveBeenCalled(); // Message still saved

      // Restore Date
      jest.restoreAllMocks();
    });
  });
});
