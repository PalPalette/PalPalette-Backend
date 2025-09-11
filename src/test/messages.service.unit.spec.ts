import { Test, TestingModule } from "@nestjs/testing";
import { MessagesService } from "../modules/messages/messages.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Message } from "../modules/messages/entities/message.entity";
import { Device } from "../modules/devices/entities/device.entity";
import { User } from "../modules/users/entities/user.entity";
import { Repository } from "typeorm";
import { TestFixtures } from "./fixtures";
import { CreateMessageDto } from "../modules/messages/dto/create-message.dto";
import { MessagesGateway } from "../modules/messages/messages.gateway";

describe("MessagesService Unit Tests", () => {
  let service: MessagesService;
  let messageRepo: Repository<Message>;
  let deviceRepo: Repository<Device>;
  let userRepo: Repository<User>;
  let messagesGateway: MessagesGateway;

  const mockMessageRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockDeviceRepo = {
    findOne: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockMessagesGateway = {
    emitNewMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepo,
        },
        {
          provide: getRepositoryToken(Device),
          useValue: mockDeviceRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: MessagesGateway,
          useValue: mockMessagesGateway,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    messageRepo = module.get<Repository<Message>>(getRepositoryToken(Message));
    deviceRepo = module.get<Repository<Device>>(getRepositoryToken(Device));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    messagesGateway = module.get<MessagesGateway>(MessagesGateway);

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a message successfully", async () => {
      const createDto: CreateMessageDto = {
        senderId: "sender-id",
        recipientId: "recipient-id",
        deviceId: "device-id",
        colors: ["#FF0000", "#00FF00"],
        content: "Hello World",
      };

      const mockSender = TestFixtures.createUser({ id: "sender-id" });
      const mockRecipient = TestFixtures.createUser({ id: "recipient-id" });
      const mockDevice = TestFixtures.createDevice({ id: "device-id" });
      const mockMessage = TestFixtures.createMessage({
        sender: mockSender,
        recipient: mockRecipient,
        device: mockDevice,
      });

      mockUserRepo.findOne
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(mockRecipient);
      mockDeviceRepo.findOne.mockResolvedValue(mockDevice);
      mockMessageRepo.create.mockReturnValue(mockMessage);
      mockMessageRepo.save.mockResolvedValue(mockMessage);

      const result = await service.create(createDto);

      expect(result).toEqual(mockMessage);
      expect(mockMessagesGateway.emitNewMessage).toHaveBeenCalledWith(
        mockMessage
      );
    });

    it("should throw error when sender not found", async () => {
      const createDto: CreateMessageDto = {
        senderId: "non-existent-sender",
        recipientId: "recipient-id",
        deviceId: "device-id",
        colors: ["#FF0000"],
      };

      mockUserRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(
        "Invalid sender, recipient, or device"
      );
    });
  });

  describe("findAll", () => {
    it("should return all messages with relations", async () => {
      const mockMessages = [
        TestFixtures.createMessage(),
        TestFixtures.createMessage(),
      ];

      mockMessageRepo.find.mockResolvedValue(mockMessages);

      const result = await service.findAll();

      expect(result).toEqual(mockMessages);
      expect(mockMessageRepo.find).toHaveBeenCalledWith({
        relations: ["sender", "recipient", "device"],
      });
    });
  });
});
