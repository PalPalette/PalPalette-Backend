import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Device } from "../../devices/entities/device.entity";

export enum MessageStatus {
  SENT = "sent",
  DELIVERED = "delivered",
  FAILED = "failed",
}

@Entity()
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.sentMessages, {
    onDelete: "SET NULL",
    nullable: true,
  })
  sender: User;

  @ManyToOne(() => User, (user) => user.receivedMessages, {
    onDelete: "SET NULL",
    nullable: true,
  })
  recipient: User;

  @ManyToOne(() => Device, (device) => device.messages, {
    onDelete: "SET NULL",
    nullable: true,
  })
  device: Device;

  @Column({ type: "json" })
  colors: any[];

  @Column({ nullable: true })
  imageUrl: string;

  @CreateDateColumn()
  sentAt: Date;

  @Column({ nullable: true })
  deliveredAt: Date;

  @Column({
    type: "varchar",
    default: MessageStatus.SENT,
    enum: MessageStatus,
  })
  status: MessageStatus;
}
