import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RevokeDeviceDto {
  @ApiProperty({
    description: "Name of the device session to revoke",
    example: "My iPhone",
  })
  @IsString()
  @IsNotEmpty()
  device_name: string;
}
