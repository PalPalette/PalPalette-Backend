import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

@Entity("refresh_tokens")
@Index(["userId"])
@Index(["token"])
@Index(["expiresAt"])
export class RefreshToken {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255, unique: true })
  token: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "device_name", type: "varchar", length: 100, nullable: true })
  deviceName?: string;

  @Column({
    name: "device_fingerprint",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  deviceFingerprint?: string;

  @Column({ name: "ip_address", type: "varchar", length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: "user_agent", type: "text", nullable: true })
  userAgent?: string;

  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt: Date;

  @Column({ name: "is_revoked", type: "boolean", default: false })
  isRevoked: boolean;

  @Column({ name: "last_used_at", type: "timestamp", nullable: true })
  lastUsedAt?: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // Soft delete for audit trail
  @Column({ name: "deleted_at", type: "timestamp", nullable: true })
  deletedAt?: Date;
}
