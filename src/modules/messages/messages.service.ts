import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Message } from "./entities/message.entity";
import { CreateMessageDto } from "./dto/create-message.dto";
import { User } from "../users/entities/user.entity";
import { Device } from "../devices/entities/device.entity";
import { MessagesGateway } from "./messages.gateway";

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @Inject(forwardRef(() => MessagesGateway))
    private readonly messagesGateway: MessagesGateway
  ) {}

  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    const sender = await this.userRepository.findOne({
      where: { id: createMessageDto.senderId },
    });
    const recipient = await this.userRepository.findOne({
      where: { id: createMessageDto.recipientId },
    });
    const device = await this.deviceRepository.findOne({
      where: { id: createMessageDto.deviceId },
    });
    if (!sender || !recipient || !device)
      throw new Error("Invalid sender, recipient, or device");
    const message = this.messageRepository.create({
      sender,
      recipient,
      device,
      colors: createMessageDto.colors,
    });
    const savedMessage = await this.messageRepository.save(message);
    this.messagesGateway.emitNewMessage(savedMessage);
    return savedMessage;
  }

  async findAll(): Promise<Message[]> {
    return this.messageRepository.find({
      relations: ["sender", "recipient", "device"],
    });
  }

  async findById(id: string): Promise<Message | null> {
    return this.messageRepository.findOne({
      where: { id },
      relations: ["sender", "recipient", "device"],
    });
  }

  async findByRecipient(recipientId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: { recipient: { id: recipientId } },
      relations: ["sender", "recipient", "device"],
      order: { sentAt: "DESC" },
    });
  }

  async findUndeliveredMessages(recipientId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: {
        recipient: { id: recipientId },
        deliveredAt: null,
      },
      relations: ["sender", "recipient", "device"],
      order: { sentAt: "DESC" },
    });
  }

  async markAsDelivered(messageId: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (message) {
      message.deliveredAt = new Date();
      return this.messageRepository.save(message);
    }

    throw new Error("Message not found");
  }

  async getRecentMessages(
    recipientId: string,
    limit: number = 50
  ): Promise<Message[]> {
    return this.messageRepository.find({
      where: { recipient: { id: recipientId } },
      relations: ["sender", "recipient", "device"],
      order: { sentAt: "DESC" },
      take: limit,
    });
  }
}
