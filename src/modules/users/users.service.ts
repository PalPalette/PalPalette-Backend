import {
  Injectable,
  Inject,
  forwardRef,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { RegisterUserDto } from "./dto/register-user.dto";
import { MessagesService } from "../messages/messages.service";
import { MessagesGateway } from "../messages/messages.gateway";
import {
  SetMessageTimeframeDto,
  MessageTimeframeResponseDto,
} from "./dto/message-timeframe.dto";
import * as bcrypt from "bcrypt";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
    @Inject(forwardRef(() => MessagesGateway))
    private readonly messagesGateway: MessagesGateway
  ) {}

  async register(registerUserDto: RegisterUserDto): Promise<User> {
    const { email, password, displayName } = registerUserDto;

    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    const hashedPassword = await this.hashPassword(password);
    const user = this.userRepository.create({
      email,
      passwordHash: hashedPassword,
      displayName,
    });
    return this.userRepository.save(user);
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12; // Increased from 10 to 12 for better security
    return bcrypt.hash(password, saltRounds);
  }

  async validatePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async updateProfile(id: string, update: Partial<User>): Promise<User> {
    await this.userRepository.update(id, update);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  // Missed messages functionality
  async getReceivedMessages(userId: string) {
    return this.messagesService.getRecentMessages(userId);
  }

  async getUndeliveredMessages(userId: string) {
    return this.messagesService.findUndeliveredMessages(userId);
  }

  async replayMessageOnDevice(
    userId: string,
    messageId: string,
    deviceId: string
  ) {
    const message = await this.messagesService.findById(messageId);

    if (!message || message.recipient.id !== userId) {
      throw new Error("Message not found or access denied");
    }

    // Send to device via WebSocket
    const delivered = await this.messagesGateway.sendColorPaletteToDevice(
      deviceId,
      {
        colors: message.colors,
        messageId: message.id,
        senderId: message.sender.id,
        timestamp: message.sentAt,
      }
    );

    if (delivered) {
      return { success: true, message: "Color palette sent to device" };
    } else {
      return { success: false, message: "Device not connected" };
    }
  }

  // Message timeframe functionality
  async setMessageTimeframe(
    userId: string,
    dto: SetMessageTimeframeDto
  ): Promise<MessageTimeframeResponseDto> {
    // Validate that both times are provided or both are cleared
    if (
      (dto.messageStartTime && !dto.messageEndTime) ||
      (!dto.messageStartTime && dto.messageEndTime)
    ) {
      throw new BadRequestException(
        "Both start and end times must be provided together, or both cleared"
      );
    }

    // If times are provided, validate that start time is before end time
    if (dto.messageStartTime && dto.messageEndTime) {
      const startTime = this.parseTimeString(dto.messageStartTime);
      const endTime = this.parseTimeString(dto.messageEndTime);

      if (startTime >= endTime) {
        throw new BadRequestException("Start time must be before end time");
      }
    }

    // Convert HH:mm format to HH:mm:ss for database storage
    const update: Partial<User> = {};
    if (dto.messageStartTime) {
      update.messageStartTime = dto.messageStartTime + ":00";
    } else {
      update.messageStartTime = null;
    }

    if (dto.messageEndTime) {
      update.messageEndTime = dto.messageEndTime + ":00";
    } else {
      update.messageEndTime = null;
    }

    await this.userRepository.update(userId, update);

    return this.getMessageTimeframe(userId);
  }

  async getMessageTimeframe(
    userId: string
  ): Promise<MessageTimeframeResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ["messageStartTime", "messageEndTime"],
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Convert HH:mm:ss format back to HH:mm for API response
    const startTime = user.messageStartTime
      ? user.messageStartTime.substring(0, 5)
      : null;
    const endTime = user.messageEndTime
      ? user.messageEndTime.substring(0, 5)
      : null;

    return {
      messageStartTime: startTime,
      messageEndTime: endTime,
      isConfigured: !!(startTime && endTime),
    };
  }

  // Helper method to check if current time is within user's messaging timeframe
  isWithinMessagingTimeframe(user: User): boolean {
    if (!user.messageStartTime || !user.messageEndTime) {
      return true; // No timeframe configured, always allow messages
    }

    const now = new Date();
    const currentTime = this.parseTimeString(
      now.toTimeString().substring(0, 5)
    ); // Get HH:mm from current time

    const startTime = this.parseTimeString(
      user.messageStartTime.substring(0, 5)
    );
    const endTime = this.parseTimeString(user.messageEndTime.substring(0, 5));

    return currentTime >= startTime && currentTime <= endTime;
  }

  private parseTimeString(timeStr: string): number {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes; // Convert to minutes for easy comparison
  }
}
