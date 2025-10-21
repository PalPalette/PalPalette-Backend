import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MessageResponseDto {
  @ApiProperty({
    description: "Unique identifier for the message",
    example: "uuid-message-123",
  })
  id: string;

  @ApiProperty({
    description: "Message sender information",
    type: "object",
    properties: {
      id: { type: "string", example: "uuid-sender-123" },
      email: { type: "string", example: "sender@example.com" },
      displayName: { type: "string", example: "John Doe" },
    },
  })
  sender: {
    id: string;
    email: string;
    displayName: string;
  };

  @ApiProperty({
    description: "Message recipient information",
    type: "object",
    properties: {
      id: { type: "string", example: "uuid-recipient-456" },
      email: { type: "string", example: "recipient@example.com" },
      displayName: { type: "string", example: "Jane Smith" },
    },
  })
  recipient: {
    id: string;
    email: string;
    displayName: string;
  };

  @ApiPropertyOptional({
    description: "Device information (if associated)",
    type: "object",
    nullable: true,
    properties: {
      id: { type: "string", example: "uuid-device-789" },
      name: { type: "string", example: "Living Room LEDs" },
      type: { type: "string", example: "esp32" },
    },
  })
  device?: {
    id: string;
    name: string;
    type: string;
  };

  @ApiProperty({
    description: "Array of color codes in the message",
    type: [String],
    example: ["#FF6B35", "#F7931E", "#FFD23F", "#06FFA5"],
  })
  colors: any[];

  @ApiPropertyOptional({
    description: "Optional image URL associated with the message",
    example: "https://example.com/image.jpg",
    nullable: true,
  })
  imageUrl?: string;

  @ApiProperty({
    description: "Timestamp when the message was sent",
    example: "2025-10-21T12:00:00Z",
    type: "string",
    format: "date-time",
  })
  sentAt: Date;

  @ApiPropertyOptional({
    description: "Timestamp when the message was delivered to the device",
    example: "2025-10-21T12:01:00Z",
    type: "string",
    format: "date-time",
    nullable: true,
  })
  deliveredAt?: Date;
}
