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

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
}
