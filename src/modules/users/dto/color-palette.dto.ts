import {
  IsString,
  IsArray,
  IsOptional,
  ArrayMinSize,
  IsHexColor,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateColorPaletteDto {
  @ApiProperty({
    example: "Sunset Colors",
    description: "Name of the color palette",
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: ["#FF6B35", "#F7931E", "#FFD23F", "#06FFA5"],
    description: "Array of hex color codes",
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsHexColor({ each: true })
  colors: string[];

  @ApiPropertyOptional({
    example: "Beautiful sunset colors for evening themes",
    description: "Optional description of the color palette",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: "https://example.com/image.jpg",
    description: "Optional image URL for the palette",
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateColorPaletteDto {
  @ApiPropertyOptional({
    example: "Updated Sunset Colors",
    description: "Updated name of the color palette",
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: ["#FF6B35", "#F7931E", "#FFD23F", "#06FFA5"],
    description: "Updated array of hex color codes",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsHexColor({ each: true })
  colors?: string[];

  @ApiPropertyOptional({
    example: "Updated description for the palette",
    description: "Updated description of the color palette",
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class SendPaletteToFriendsDto {
  @ApiPropertyOptional({
    example: "uuid-string",
    description: "ID of existing palette to send",
  })
  @IsOptional()
  @IsString()
  paletteId?: string;

  @ApiProperty({
    example: ["friend-uuid-1", "friend-uuid-2"],
    description: "Array of friend user IDs to send palette to",
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  friendIds: string[];

  // For direct color sending without palette storage
  @ApiPropertyOptional({
    example: ["#FF6B35", "#F7931E", "#FFD23F"],
    description: "Direct colors to send (if not using existing palette)",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  colors?: string[];

  @ApiPropertyOptional({
    example: "https://example.com/image.jpg",
    description: "Optional image URL for the palette message",
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
