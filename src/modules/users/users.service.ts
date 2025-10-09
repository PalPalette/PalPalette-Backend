import {
  Injectable,
  Inject,
  forwardRef,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { RegisterUserDto } from "./dto/register-user.dto";
import { MessagesService } from "../messages/messages.service";
import { MessagesGateway } from "../messages/messages.gateway";
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
}
