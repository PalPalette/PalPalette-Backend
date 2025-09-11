import { Test, TestingModule } from "@nestjs/testing";
import { MessagesService } from "./messages.service";
import { MessagesGateway } from "./messages.gateway";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Message } from "./entities/message.entity";
import { User } from "../users/entities/user.entity";
import { Device } from "../devices/entities/device.entity";
import { Repository } from "typeorm";
import { CreateMessageDto } from "./dto/create-message.dto";

const mockUser = { id: "user-id" } as User;
const mockRecipient = { id: "recipient-id" } as User;
const mockDevice = { id: "device-id" } as Device;
const mockMessage = {
  id: "msg-id",
  sender: mockUser,
  recipient: mockRecipient,
  device: mockDevice,
  colors: ["#ff0000"],
};

describe("MessagesService", () => {
  let service: MessagesService;
  let messageRepo: Repository<Message>;
  let userRepo: Repository<User>;
  let deviceRepo: Repository<Device>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getRepositoryToken(Message),
          useValue: {
            create: jest.fn().mockReturnValue(mockMessage),
            save: jest.fn().mockResolvedValue(mockMessage),
            find: jest.fn().mockResolvedValue([mockMessage]),
            findOne: jest.fn().mockResolvedValue(mockMessage),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockImplementation(({ where: { id } }) => {
              if (id === "user-id") return Promise.resolve(mockUser);
              if (id === "recipient-id") return Promise.resolve(mockRecipient);
              return null;
            }),
          },
        },
        {
          provide: getRepositoryToken(Device),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockDevice),
          },
        },
        {
          provide: MessagesGateway,
          useValue: {
            emitNewMessage: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    messageRepo = module.get<Repository<Message>>(getRepositoryToken(Message));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    deviceRepo = module.get<Repository<Device>>(getRepositoryToken(Device));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should create a message", async () => {
    const dto: CreateMessageDto = {
      senderId: "user-id",
      recipientId: "recipient-id",
      deviceId: "device-id",
      colors: ["#ff0000"],
    };
    expect(await service.create(dto)).toEqual(mockMessage);
    expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: "user-id" } });
    expect(userRepo.findOne).toHaveBeenCalledWith({
      where: { id: "recipient-id" },
    });
    expect(deviceRepo.findOne).toHaveBeenCalledWith({
      where: { id: "device-id" },
    });
    expect(messageRepo.create).toHaveBeenCalledWith({
      sender: mockUser,
      recipient: mockRecipient,
      device: mockDevice,
      colors: ["#ff0000"],
    });
    expect(messageRepo.save).toHaveBeenCalledWith(mockMessage);
  });

  it("should find all messages", async () => {
    expect(await service.findAll()).toEqual([mockMessage]);
    expect(messageRepo.find).toHaveBeenCalledWith({
      relations: ["sender", "recipient", "device"],
    });
  });

  it("should find message by id", async () => {
    expect(await service.findById("msg-id")).toEqual(mockMessage);
    expect(messageRepo.findOne).toHaveBeenCalledWith({
      where: { id: "msg-id" },
      relations: ["sender", "recipient", "device"],
    });
  });

  it("should find messages by recipient", async () => {
    expect(await service.findByRecipient("recipient-id")).toEqual([
      mockMessage,
    ]);
    expect(messageRepo.find).toHaveBeenCalledWith({
      where: { recipient: { id: "recipient-id" } },
      relations: ["sender", "recipient", "device"],
      order: { sentAt: "DESC" },
    });
  });
});
