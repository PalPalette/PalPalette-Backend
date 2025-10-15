import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsIn,
} from "class-validator";
import { LightingStatus } from "../lighting-system/lighting-system.dto";

export class UpdateDeviceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  lastSeenAt?: Date;

  // Lighting system fields
  @IsString()
  @IsOptional()
  @IsIn(["nanoleaf", "wled", "ws2812"])
  lightingSystemType?: string;

  @IsString()
  @IsOptional()
  lightingHostAddress?: string;

  @IsNumber()
  @IsOptional()
  lightingPort?: number;

  @IsString()
  @IsOptional()
  lightingAuthToken?: string;

  @IsObject()
  @IsOptional()
  lightingCustomConfig?: any;

  @IsBoolean()
  @IsOptional()
  lightingSystemConfigured?: boolean;

  @IsOptional()
  @IsIn([
    LightingStatus.UNKNOWN,
    LightingStatus.WORKING,
    LightingStatus.ERROR,
    LightingStatus.AUTHENTICATION_REQUIRED,
  ])
  lightingStatus?: LightingStatus;
}
