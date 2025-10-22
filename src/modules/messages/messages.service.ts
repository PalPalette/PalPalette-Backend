import { Injectable, Inject, forwardRef, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Message } from "./entities/message.entity";
import { CreateMessageDto } from "./dto/create-message.dto";
import { User } from "../users/entities/user.entity";
import { Device } from "../devices/entities/device.entity";
import { MessagesGateway } from "./messages.gateway";
import { PushService } from "../push/push.service";
import { MessagePushData } from "../push/dto/push-notification-payload.dto";

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @Inject(forwardRef(() => MessagesGateway))
    private readonly messagesGateway: MessagesGateway,
    private readonly pushService: PushService
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

    // Try to deliver to device via WebSocket
    const deliveredToDevice =
      await this.messagesGateway.sendColorPaletteToDevice(device.id, {
        colors: createMessageDto.colors,
        messageId: savedMessage.id,
        senderId: sender.id,
        senderName: sender.displayName || sender.email,
        timestamp: savedMessage.sentAt,
      });

    // Send push notification to recipient
    // Push bypasses timeframe so user can be notified even during quiet hours
    try {
      const senderName = sender.displayName || sender.email;
      const previewColors = createMessageDto.colors.slice(0, 3); // First 3 colors

      const pushData: MessagePushData = {
        type: "message",
        messageId: savedMessage.id,
        senderId: sender.id,
        senderName,
        timestamp: savedMessage.sentAt.toISOString(),
        previewColors,
      };

      // Customize message based on device connectivity
      const pushBody = deliveredToDevice
        ? "You received a color palette message"
        : "You received a color palette message. Your device is offline - tap to view and replay.";

      await this.pushService.sendToUser(
        recipient.id,
        {
          title: `New message from ${senderName}`,
          body: pushBody,
          data: pushData,
        },
        { bypassTimeframe: true, priority: "high" }
      );

      this.logger.log(
        `Push notification sent for message ${savedMessage.id} to user ${
          recipient.id
        } (device ${deliveredToDevice ? "online" : "offline"})`
      );
    } catch (error) {
      // Don't fail message creation if push fails
      this.logger.error(
        `Failed to send push notification for message ${savedMessage.id}: ${error.message}`,
        error.stack
      );
    }

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

  async replayMessage(
    messageId: string,
    userId: string
  ): Promise<{
    success: boolean;
    message: string;
    deliveredToDevices?: string[];
  }> {
    // Find the message
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ["sender", "recipient", "device"],
    });

    if (!message) {
      throw new Error("Message not found");
    }

    // Verify that the user is the recipient of this message
    if (message.recipient.id !== userId) {
      throw new Error("Unauthorized: You can only replay messages sent to you");
    }

    // Find all devices belonging to the user
    const userDevices = await this.deviceRepository.find({
      where: { user: { id: userId } },
    });

    if (userDevices.length === 0) {
      return {
        success: false,
        message: "No devices found for this user",
      };
    }

    // Send the message to all user's devices (bypassing timeframe check)
    const deliveredDevices: string[] = [];

    for (const device of userDevices) {
      const delivered = await this.messagesGateway.sendColorPaletteToDevice(
        device.id,
        {
          colors: message.colors,
          messageId: message.id,
          senderId: message.sender.id,
          senderName: message.sender?.displayName || message.sender?.email,
          timestamp: message.sentAt,
        }
      );

      if (delivered) {
        deliveredDevices.push(device.id);
      }
    }

    if (deliveredDevices.length > 0) {
      return {
        success: true,
        message: `Message replayed successfully to ${deliveredDevices.length} device(s)`,
        deliveredToDevices: deliveredDevices,
      };
    } else {
      return {
        success: false,
        message:
          "Failed to replay message - no devices are currently connected",
      };
    }
  }
}
