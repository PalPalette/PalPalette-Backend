import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ReplayMessageResponseDto {
  @ApiProperty({
    description: "Whether the message replay was successful",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "Human-readable message describing the result",
    example: "Message replayed successfully to 2 device(s)",
  })
  message: string;

  @ApiPropertyOptional({
    description: "Array of device IDs that received the replayed message",
    type: [String],
    example: ["device-uuid-1", "device-uuid-2"],
  })
  deliveredToDevices?: string[];
}
