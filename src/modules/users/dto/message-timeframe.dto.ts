import { IsString, IsOptional, Matches, ValidateIf } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SetMessageTimeframeDto {
  @ApiPropertyOptional({
    example: "09:00",
    description: "Start time for receiving messages (24-hour format HH:mm)",
    pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$",
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "messageStartTime must be in HH:mm format (24-hour)",
  })
  messageStartTime?: string;

  @ApiPropertyOptional({
    example: "22:00",
    description: "End time for receiving messages (24-hour format HH:mm)",
    pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$",
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "messageEndTime must be in HH:mm format (24-hour)",
  })
  @ValidateIf((dto) => dto.messageStartTime !== undefined)
  messageEndTime?: string;
}

export class MessageTimeframeResponseDto {
  @ApiProperty({
    example: "09:00",
    description: "Start time for receiving messages",
    nullable: true,
  })
  messageStartTime: string | null;

  @ApiProperty({
    example: "22:00",
    description: "End time for receiving messages",
    nullable: true,
  })
  messageEndTime: string | null;

  @ApiProperty({
    example: true,
    description: "Whether the user has configured a timeframe",
  })
  isConfigured: boolean;
}
