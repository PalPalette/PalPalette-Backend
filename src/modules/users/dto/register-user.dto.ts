import { IsString, IsEmail, MinLength, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterUserDto {
  @ApiProperty({
    example: "user@example.com",
    description: "User email address",
    format: "email",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: "password123",
    description: "User password (minimum 6 characters)",
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: "John Doe",
    description: "Display name for the user",
  })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({
    example: "My iPhone",
    description: "Optional device name for tracking user sessions",
  })
  @IsOptional()
  @IsString()
  device_name?: string;
}
