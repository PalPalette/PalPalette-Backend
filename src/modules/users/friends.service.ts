import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { Friendship, FriendshipStatus } from "./entities/friendship.entity";
import { User } from "./entities/user.entity";
import {
  SendFriendRequestDto,
  RespondToFriendRequestDto,
} from "./dto/friendship.dto";
import { Device } from "../devices/entities/device.entity";

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  async sendFriendRequest(
    requesterId: string,
    dto: SendFriendRequestDto
  ): Promise<Friendship> {
    return this.dataSource.transaction(async (manager) => {
      // Find the user to send request to
      const addressee = await manager.findOne(User, {
        where: { email: dto.email },
      });
      if (!addressee) {
        throw new NotFoundException("User not found");
      }

      if (addressee.id === requesterId) {
        throw new BadRequestException("Cannot send friend request to yourself");
      }

      // Check if friendship already exists
      const existingFriendship = await manager.findOne(Friendship, {
        where: [
          { requesterId, addresseeId: addressee.id },
          { requesterId: addressee.id, addresseeId: requesterId },
        ],
      });

      if (existingFriendship) {
        throw new BadRequestException("Friendship already exists or pending");
      }

      const friendship = manager.create(Friendship, {
        requesterId,
        addresseeId: addressee.id,
        status: FriendshipStatus.PENDING,
      });

      return manager.save(friendship);
    });
  }

  async respondToFriendRequest(
    userId: string,
    dto: RespondToFriendRequestDto
  ): Promise<Friendship> {
    return this.dataSource.transaction(async (manager) => {
      const friendship = await manager.findOne(Friendship, {
        where: {
          id: dto.friendshipId,
          addresseeId: userId,
          status: FriendshipStatus.PENDING,
        },
      });

      if (!friendship) {
        throw new NotFoundException("Friend request not found");
      }

      if (dto.action === "accept") {
        friendship.status = FriendshipStatus.ACCEPTED;
        return manager.save(friendship);
      } else {
        await manager.remove(friendship);
        return friendship;
      }
    });
  }

  async getFriends(userId: string): Promise<User[]> {
    const friendships = await this.friendshipRepository.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
      relations: ["requester", "addressee"],
    });

    return friendships.map((friendship) =>
      friendship.requesterId === userId
        ? friendship.addressee
        : friendship.requester
    );
  }

  async getPendingRequests(userId: string): Promise<Friendship[]> {
    return this.friendshipRepository.find({
      where: {
        addresseeId: userId,
        status: FriendshipStatus.PENDING,
      },
      relations: ["requester"],
    });
  }

  async getSentRequests(userId: string): Promise<Friendship[]> {
    return this.friendshipRepository.find({
      where: {
        requesterId: userId,
        status: FriendshipStatus.PENDING,
      },
      relations: ["addressee"],
    });
  }

  async getFriendsWithDevices(userId: string): Promise<any[]> {
    const friends = await this.getFriends(userId);
    console.log(
      "Fetched friends:",
      friends.map((f) => ({ id: f.id, displayName: f.displayName }))
    );
    return Promise.all(
      friends.map(async (friend) => {
        const devices = await this.deviceRepository.find({
          where: { userId: friend.id },
        });
        console.log(
          `Devices for friend ${friend.id} (${friend.displayName}):`,
          devices
        );
        return {
          id: friend.id,
          displayName: friend.displayName,
          email: friend.email,
          devices: devices.map((d) => ({
            id: d.id,
            name: d.name,
            type: d.type,
          })),
        };
      })
    );
  }
}
