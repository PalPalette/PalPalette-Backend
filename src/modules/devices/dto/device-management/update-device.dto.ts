import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsIn,
} from "class-validator";

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

  @IsString()
  @IsOptional()
  @IsIn(["unknown", "working", "error", "authentication_required"])
  lightingStatus?: string;
}
