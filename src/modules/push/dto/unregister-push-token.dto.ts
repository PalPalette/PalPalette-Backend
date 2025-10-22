import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class UnregisterPushTokenDto {
  @ApiProperty({
    description: "FCM token to unregister",
    example: "eXaMpLe_fCm_ToKeN_1234567890",
  })
  @IsString()
  @Length(1, 500)
  token: string;
}
