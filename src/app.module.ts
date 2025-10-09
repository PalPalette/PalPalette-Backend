import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { SecurityMiddleware } from "./common/middleware/security.middleware";
import { UsersModule } from "./modules/users/users.module";
import { DevicesModule } from "./modules/devices/devices.module";
import { MessagesModule } from "./modules/messages/messages.module";
import { AuthModule } from "./modules/auth/auth.module";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";
import { JwtAuthGuard } from "./modules/auth/jwt-auth.guard";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
// import { validateEnvironment } from "./config/validate-environment";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // validate: validateEnvironment, // Temporarily disabled
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: "short",
            ttl: 1000, // 1 second
            limit: 3,
          },
          {
            name: "medium",
            ttl: 10000, // 10 seconds
            limit: 20,
          },
          {
            name: "long",
            ttl: 60000, // 1 minute
            limit: 100,
          },
        ],
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get<string>("DB_HOST"),
        port: parseInt(configService.get<string>("DB_PORT"), 10),
        username: configService.get<string>("DB_USERNAME"),
        password: configService.get<string>("DB_PASSWORD"),
        database: configService.get<string>("DB_DATABASE"),
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        synchronize: true, // Set to false in production
      }),
    }),
    UsersModule,
    DevicesModule,
    MessagesModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityMiddleware).forRoutes("*");
  }
}
