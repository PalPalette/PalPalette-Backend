import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PushService } from "./push.service";
import { PushController } from "./push.controller";
import { PushSubscription } from "./entities/push-subscription.entity";
import { User } from "../users/entities/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription, User])],
  providers: [PushService],
  controllers: [PushController],
  exports: [PushService],
})
export class PushModule {}
