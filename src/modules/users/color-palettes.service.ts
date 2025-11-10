import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ColorPalette } from "./entities/color-palette.entity";
import { Message } from "../messages/entities/message.entity";
import { Device } from "../devices/entities/device.entity";
import { User } from "./entities/user.entity";
import {
  CreateColorPaletteDto,
  UpdateColorPaletteDto,
  SendPaletteToFriendsDto,
} from "./dto/color-palette.dto";
import { FriendsService } from "./friends.service";
import { UsersService } from "./users.service";
import { MessagesGateway } from "../messages/messages.gateway";
import { PushService } from "../push/push.service";
import { MessagePushData } from "../push/dto/push-notification-payload.dto";

@Injectable()
export class ColorPalettesService {
  private readonly logger = new Logger(ColorPalettesService.name);

  constructor(
    @InjectRepository(ColorPalette)
    private readonly paletteRepository: Repository<ColorPalette>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly friendsService: FriendsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => MessagesGateway))
    private readonly messagesGateway: MessagesGateway,
    private readonly pushService: PushService
  ) {}

  async create(
    userId: string,
    dto: CreateColorPaletteDto
  ): Promise<ColorPalette> {
    const palette = this.paletteRepository.create({
      ...dto,
      createdById: userId,
    });

    return this.paletteRepository.save(palette);
  }

  async findUserPalettes(userId: string): Promise<ColorPalette[]> {
    return this.paletteRepository.find({
      where: { createdById: userId },
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: string): Promise<ColorPalette> {
    const palette = await this.paletteRepository.findOne({
      where: { id },
      relations: ["createdBy"],
    });

    if (!palette) {
      throw new NotFoundException("Color palette not found");
    }

    return palette;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateColorPaletteDto
  ): Promise<ColorPalette> {
    const palette = await this.findById(id);

    if (palette.createdById !== userId) {
      throw new ForbiddenException("You can only update your own palettes");
    }

    Object.assign(palette, dto);
    return this.paletteRepository.save(palette);
  }

  async delete(userId: string, id: string): Promise<void> {
    const palette = await this.findById(id);

    if (palette.createdById !== userId) {
      throw new ForbiddenException("You can only delete your own palettes");
    }

    await this.paletteRepository.remove(palette);
  }

  async sendPaletteToFriends(
    userId: string,
    dto: SendPaletteToFriendsDto
  ): Promise<Message[]> {
    // For direct sending without palette storage, create palette from colors
    if (!dto.paletteId && dto.colors && dto.colors.length > 0) {
      return this.sendDirectColorPalette(userId, {
        friendIds: dto.friendIds,
        colors: dto.colors,
        imageUrl: dto.imageUrl,
      });
    }

    if (!dto.paletteId) {
      throw new Error("Either paletteId or colors must be provided");
    }

    const palette = await this.findById(dto.paletteId);

    if (palette.createdById !== userId) {
      throw new ForbiddenException("You can only send your own palettes");
    }

    return this.sendPaletteToFriendsHelper(
      userId,
      dto.friendIds,
      palette.colors,
      palette.imageUrl
    );
  }

  // New method for direct color palette sending (without storage)
  async sendDirectColorPalette(
    userId: string,
    dto: { friendIds: string[]; colors: any[]; imageUrl?: string }
  ): Promise<Message[]> {
    return this.sendPaletteToFriendsHelper(
      userId,
      dto.friendIds,
      dto.colors,
      dto.imageUrl
    );
  }

  private async sendPaletteToFriendsHelper(
    userId: string,
    friendIds: string[],
    colors: any[],
    imageUrl?: string
  ): Promise<Message[]> {
    // Verify all recipients are friends
    const friends = await this.friendsService.getFriends(userId);
    const friendIds_mapped = friends.map((friend) => friend.id);

    const invalidRecipients = friendIds.filter(
      (id) => !friendIds_mapped.includes(id)
    );
    if (invalidRecipients.length > 0) {
      throw new ForbiddenException(
        "You can only send palettes to your friends"
      );
    }

    // Get sender information
    const sender = await this.userRepository.findOne({ where: { id: userId } });

    // Create messages for each friend
    const messages = await Promise.all(
      friendIds.map(async (friendId) => {
        const recipient = await this.userRepository.findOne({
          where: { id: friendId },
        });

        const message = this.messageRepository.create({
          sender: { id: userId },
          recipient: { id: friendId },
          colors: colors.map((color) => ({ hex: color })),
          imageUrl,
        });

        const savedMessage = await this.messageRepository.save(message);

        // Check if recipient is within their messaging timeframe
        const isWithinTimeframe =
          this.usersService.isWithinMessagingTimeframe(recipient);

        // Send to recipient's devices via WebSocket only if within timeframe
        if (isWithinTimeframe) {
          const recipientDevices = await this.deviceRepository.find({
            where: { user: { id: friendId } },
          });

          for (const device of recipientDevices) {
            const delivered =
              await this.messagesGateway.sendColorPaletteToDevice(device.id, {
                colors: savedMessage.colors,
                messageId: savedMessage.id,
                senderId: userId,
                senderName: sender?.displayName || sender?.email,
                timestamp: savedMessage.sentAt,
              });

            if (delivered) {
              savedMessage.deliveredAt = new Date();
              await this.messageRepository.save(savedMessage);
            }
          }
        }

        // Send push notification to recipient's mobile app
        try {
          const senderName = sender?.displayName || sender?.email || "Someone";
          const previewColors = savedMessage.colors.slice(0, 3); // First 3 colors

          const pushData: MessagePushData = {
            type: "message",
            messageId: savedMessage.id,
            senderId: userId,
            senderName,
            timestamp: savedMessage.sentAt.toISOString(),
            previewColors,
          };

          // Customize message based on whether device is online
          const pushBody = isWithinTimeframe
            ? "You received a color palette message"
            : "You received a color palette message. Your device is offline - tap to view and replay.";

          await this.pushService.sendToUser(
            friendId,
            {
              title: `New message from ${senderName}`,
              body: pushBody,
              data: pushData,
            },
            { bypassTimeframe: true, priority: "high" }
          );

          this.logger.log(
            `Push notification sent for message ${
              savedMessage.id
            } to user ${friendId} (timeframe: ${
              isWithinTimeframe ? "active" : "inactive"
            })`
          );
        } catch (error) {
          // Don't fail message sending if push fails
          this.logger.error(
            `Failed to send push notification for message ${savedMessage.id}: ${error.message}`,
            error.stack
          );
        }

        return savedMessage;
      })
    );

    return messages;
  }
}
