import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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
    private readonly userRepository: Repository<User>
  ) {}

  async sendFriendRequest(
    requesterId: string,
    dto: SendFriendRequestDto
  ): Promise<Friendship> {
    // Find the user to send request to
    const addressee = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!addressee) {
      throw new NotFoundException("User not found");
    }

    if (addressee.id === requesterId) {
      throw new BadRequestException("Cannot send friend request to yourself");
    }

    // Check if friendship already exists
    const existingFriendship = await this.friendshipRepository.findOne({
      where: [
        { requesterId, addresseeId: addressee.id },
        { requesterId: addressee.id, addresseeId: requesterId },
      ],
    });

    if (existingFriendship) {
      throw new BadRequestException("Friendship already exists or pending");
    }

    const friendship = this.friendshipRepository.create({
      requesterId,
      addresseeId: addressee.id,
      status: FriendshipStatus.PENDING,
    });

    return this.friendshipRepository.save(friendship);
  }

  async respondToFriendRequest(
    userId: string,
    dto: RespondToFriendRequestDto
  ): Promise<Friendship> {
    const friendship = await this.friendshipRepository.findOne({
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
      return this.friendshipRepository.save(friendship);
    } else {
      await this.friendshipRepository.remove(friendship);
      return friendship;
    }
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
