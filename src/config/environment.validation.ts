import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsPort,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";

export enum NodeEnvironment {
  DEVELOPMENT = "development",
  PRODUCTION = "production",
  TEST = "test",
}

export class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  @IsOptional()
  NODE_ENV: NodeEnvironment = NodeEnvironment.DEVELOPMENT;

  @IsPort()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  PORT: number = 3000;

  @IsPort()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  WEBSOCKET_PORT: number = 3001;

  // Database Configuration
  @IsString()
  DB_HOST: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
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
}
