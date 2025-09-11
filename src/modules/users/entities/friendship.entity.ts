import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Unique,
} from "typeorm";
import { User } from "./user.entity";

export enum FriendshipStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  BLOCKED = "blocked",
}

@Entity()
@Unique(["requesterId", "addresseeId"])
export class Friendship {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  requesterId: string;

  @Column()
  addresseeId: string;

  @Column({
    type: "varchar",
    enum: FriendshipStatus,
    default: FriendshipStatus.PENDING,
  })
  status: FriendshipStatus;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "requesterId" })
  requester: User;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "addresseeId" })
  addressee: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
