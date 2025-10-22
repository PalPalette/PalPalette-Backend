import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsEnum, IsOptional, Length } from "class-validator";

export class RegisterPushTokenDto {
  @ApiProperty({
    description: "FCM token for push notifications",
    example: "eXaMpLe_fCm_ToKeN_1234567890",
  })
  @IsString()
  @Length(1, 500)
  token: string;

  @ApiProperty({
    description: "Platform type",
    enum: ["ios", "android", "web"],
    example: "android",
  })
  @IsEnum(["ios", "android", "web"])
  platform: string;

  @ApiProperty({
    description: "Optional device identifier",
    example: "user-phone-1",
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  deviceId?: string;
}
