import "dotenv/config";
import { DataSource } from "typeorm";
import { User } from "./modules/users/entities/user.entity";
import { Device } from "./modules/devices/entities/device.entity";
import { Message } from "./modules/messages/entities/message.entity";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [User, Device, Message],
  migrations: [__dirname + "/migrations/*{.ts,.js}"],
  synchronize: true, // Enable auto-sync for development
});
