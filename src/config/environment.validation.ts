import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
  MinLength,
} from "class-validator";
import { Transform, Type } from "class-transformer";

export enum NodeEnvironment {
  DEVELOPMENT = "development",
  PRODUCTION = "production",
  TEST = "test",
}

export class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  @IsOptional()
  NODE_ENV: NodeEnvironment = NodeEnvironment.DEVELOPMENT;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  WEBSOCKET_PORT: number = 3001;

  // Database Configuration
  @IsString()
  DB_HOST: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_DATABASE: string;

  // JWT Configuration
  @IsString()
  @MinLength(32, { message: "JWT_SECRET must be at least 32 characters long" })
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = "7d";

  // CORS Configuration
  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = "*";

  // SSL Configuration for production
  @IsString()
  @IsOptional()
  SSL_ENABLED: string = "false";

  @IsString()
  @IsOptional()
  DOMAIN_NAME: string;

  // Mobile app and ESP32 endpoints
  @IsString()
  @IsOptional()
  API_BASE_URL: string;
}
