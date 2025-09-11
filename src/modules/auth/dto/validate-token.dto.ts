import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ValidateTokenDto {
  @ApiProperty({
    description: "JWT token to validate",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  token: string;
}
