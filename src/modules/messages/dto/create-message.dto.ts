import {
  IsUUID,
  IsString,
  IsArray,
  ArrayMinSize,
  IsOptional,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateMessageDto {
  @ApiProperty({
    example: "uuid-sender-123",
    description: "ID of the user sending the message",
  })
  @IsUUID()
  senderId: string;

  @ApiProperty({
    example: "uuid-recipient-456",
    description: "ID of the user receiving the message",
  })
  @IsUUID()
  recipientId: string;

  @ApiProperty({
    example: "uuid-device-789",
    description: "ID of the device to display the colors",
  })
  @IsUUID()
  deviceId: string;

  @ApiProperty({
    example: ["#FF6B35", "#F7931E", "#FFD23F", "#06FFA5"],
    description: "Array of color codes (hex format) to display",
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  colors: string[]; // e.g., hex codes or color names

  @ApiPropertyOptional({
    example: "Check out these beautiful sunset colors!",
    description: "Optional text content for the message",
  })
  @IsOptional()
  @IsString()
  content?: string;
}
