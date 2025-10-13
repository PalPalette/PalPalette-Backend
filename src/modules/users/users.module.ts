import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersService } from "./users.service";
import { FriendsService } from "./friends.service";
import { ColorPalettesService } from "./color-palettes.service";
import { UsersController } from "./users.controller";
import { User } from "./entities/user.entity";
import { Friendship } from "./entities/friendship.entity";
import { ColorPalette } from "./entities/color-palette.entity";
import { Message } from "../messages/entities/message.entity";
import { Device } from "../devices/entities/device.entity";
import { MessagesModule } from "../messages/messages.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Friendship, ColorPalette, Message, Device]),
    forwardRef(() => MessagesModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, FriendsService, ColorPalettesService],
  exports: [UsersService, FriendsService, ColorPalettesService],
})
export class UsersModule {}
