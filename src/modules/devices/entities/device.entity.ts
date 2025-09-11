import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Message } from "../../messages/entities/message.entity";

@Entity()
export class Device {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ default: "esp32" })
  type: string; // esp32, esp8266, etc.

  @ManyToOne(() => User, (user) => user.devices, {
    onDelete: "CASCADE",
    nullable: true,
  })
  user: User | null;

  @Column({ default: "unclaimed" })
  status: string; // unclaimed, claimed, online, offline, error

  @Column({ nullable: true })
  lastSeenAt: Date;

  // Self-setup fields
  @Column({ length: 6, nullable: true })
  pairingCode: string; // 6-digit code for claiming

  @Column({ nullable: true })
  pairingCodeExpiresAt: Date; // Code expiration (30 minutes)

  @Column({ unique: true })
  macAddress: string; // For device identification

  @Column({ default: false })
  isProvisioned: boolean; // WiFi configured

  @Column({ default: false })
  isOnline: boolean; // Current online status

  // Network information
  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  wifiRSSI: number; // WiFi signal strength

  @Column({ nullable: true })
  firmwareVersion: string; // Device firmware version

  @Column({ type: "json", nullable: true })
  systemStats: any; // System statistics (free heap, uptime, etc.)

  // Lighting system configuration
  @Column({ default: "ws2812" })
  lightingSystemType: string; // nanoleaf, wled, ws2812

  @Column({ nullable: true })
  lightingHostAddress: string; // IP address for networked systems

  @Column({ nullable: true })
  lightingPort: number; // Port for networked systems

  @Column({ nullable: true })
  lightingAuthToken: string; // Auth token for systems that require it

  @Column({ type: "json", nullable: true })
  lightingCustomConfig: any; // System-specific configuration (LED count, pin, etc.)

  @Column({ default: false })
  lightingSystemConfigured: boolean; // Whether lighting system is properly configured

  @Column({ nullable: true })
  lightingLastTestAt: Date; // Last time lighting system was tested

  @Column({ default: "unknown" })
  lightingStatus: string; // unknown, working, error, authentication_required

  @Column({ type: "json", nullable: true })
  lightingCapabilities: any; // Lighting system capabilities

  @Column({ nullable: true })
  lightingLastStatusUpdate: Date; // Last time lighting status was updated

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Message, (message) => message.device)
  messages: Message[];
}
