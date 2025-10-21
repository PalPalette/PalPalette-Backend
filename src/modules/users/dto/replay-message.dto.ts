import { IsString, IsNotEmpty, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ReplayMessageOnDeviceDto {
  @ApiProperty({
    description: "ID of the device to replay the message on",
    example: "device-uuid-123",
  })
  @IsUUID()
  @IsNotEmpty()
  deviceId: string;
}
