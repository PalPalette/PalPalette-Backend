import { IsString, IsEmail, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginUserDto {
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
}
