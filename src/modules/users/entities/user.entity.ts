import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Device } from "../../devices/entities/device.entity";
import { Message } from "../../messages/entities/message.entity";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  displayName: string;

  @Column({ type: "time", nullable: true })
  messageStartTime?: string; // Time when user wants to start receiving messages (e.g., "09:00:00")

  @Column({ type: "time", nullable: true })
  messageEndTime?: string; // Time when user wants to stop receiving messages (e.g., "22:00:00")

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Device, (device) => device.user)
  devices: Device[];

  @OneToMany(() => Message, (message) => message.sender)
  sentMessages: Message[];

  @OneToMany(() => Message, (message) => message.recipient)
  receivedMessages: Message[];
}
