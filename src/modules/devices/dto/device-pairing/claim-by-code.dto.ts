import { IsString, IsNotEmpty, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ClaimByCodeDto {
  @ApiProperty({
    example: "ABC123",
    description: "Six-character pairing code displayed on device",
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: "Pairing code must be exactly 6 characters" })
  pairingCode: string;

  @ApiProperty({
    example: "Living Room LEDs",
    description: "User-friendly name for the device",
  })
  @IsString()
  @IsNotEmpty()
  deviceName: string;
}
