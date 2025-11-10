import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MessagesService } from "./messages.service";
import { MessagesController } from "./messages.controller";
import { MessagesGateway } from "./messages.gateway";
import { DeviceWebSocketService } from "./device-websocket.service";
import { Message } from "./entities/message.entity";
import { User } from "../users/entities/user.entity";
import { Device } from "../devices/entities/device.entity";
import { DevicesModule } from "../devices/devices.module";
import { PushModule } from "../push/push.module";
import { ApiUrlService } from "../../common/services/api-url.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User, Device]),
    forwardRef(() => DevicesModule),
    PushModule,
  ],
  providers: [
    MessagesService,
    MessagesGateway,
    DeviceWebSocketService,
    ApiUrlService,
  ],
  controllers: [MessagesController],
  exports: [MessagesService, MessagesGateway, DeviceWebSocketService],
})
export class MessagesModule {}
