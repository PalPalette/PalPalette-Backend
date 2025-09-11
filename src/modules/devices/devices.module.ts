import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DevicesService } from "./devices.service";
import { DevicesController } from "./devices.controller";
import { Device } from "./entities/device.entity";
import { User } from "../users/entities/user.entity";
import { MessagesModule } from "../messages/messages.module";
import { DeviceRegistrationService } from "./services/device-registration.service";
import { DevicePairingService } from "./services/device-pairing.service";
import { LightingSystemsService } from "./lighting-systems.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRES_IN", "3600s"),
        },
      }),
    }),
    forwardRef(() => MessagesModule),
  ],
  providers: [
    DevicesService,
    DeviceRegistrationService,
    DevicePairingService,
    LightingSystemsService,
  ],
  controllers: [DevicesController],
  exports: [
    DevicesService,
    DeviceRegistrationService,
    DevicePairingService,
    LightingSystemsService,
  ], // Export so other modules can use them
})
export class DevicesModule {}
