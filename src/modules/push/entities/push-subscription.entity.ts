import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

@Entity("push_subscriptions")
@Index(["token"], { unique: true })
export class PushSubscription {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: User;

  @Column({ type: "varchar", length: 500 })
  token: string;

  @Column({ type: "varchar", length: 20 })
  platform: string; // 'ios', 'android', 'web'

  @Column({ type: "varchar", length: 255, nullable: true })
  deviceId?: string; // Optional: mobile device identifier

  @Column({ type: "boolean", default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  lastSeenAt?: Date;
}
