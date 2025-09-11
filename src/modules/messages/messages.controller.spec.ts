import { Test, TestingModule } from "@nestjs/testing";
import { MessagesController } from "./messages.controller";
import { MessagesService } from "./messages.service";
import { CreateMessageDto } from "./dto/create-message.dto";

const mockMessage = {
  id: "msg-id",
  sender: { id: "user-id" },
  recipient: { id: "recipient-id" },
  device: { id: "device-id" },
  colors: ["#ff0000"],
};

describe("MessagesController", () => {
  let controller: MessagesController;
  let service: MessagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        {
          provide: MessagesService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockMessage),
            findAll: jest.fn().mockResolvedValue([mockMessage]),
            findById: jest.fn().mockResolvedValue(mockMessage),
            findByRecipient: jest.fn().mockResolvedValue([mockMessage]),
          },
        },
      ],
    }).compile();

    controller = module.get<MessagesController>(MessagesController);
    service = module.get<MessagesService>(MessagesService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should create a message", async () => {
    const dto: CreateMessageDto = {
      senderId: "user-id",
      recipientId: "recipient-id",
      deviceId: "device-id",
      colors: ["#ff0000"],
    };
    expect(await controller.create(dto)).toEqual(mockMessage);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it("should return all messages", async () => {
    expect(await controller.findAll()).toEqual([mockMessage]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it("should return message by id", async () => {
    expect(await controller.findById("msg-id")).toEqual(mockMessage);
    expect(service.findById).toHaveBeenCalledWith("msg-id");
  });

  it("should return messages by recipient", async () => {
    expect(await controller.findByRecipient("recipient-id")).toEqual([
      mockMessage,
    ]);
    expect(service.findByRecipient).toHaveBeenCalledWith("recipient-id");
  });
});
