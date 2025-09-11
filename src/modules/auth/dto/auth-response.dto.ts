import { ApiProperty } from "@nestjs/swagger";

export class AuthResponseDto {
  @ApiProperty({
    description: "JWT access token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  access_token: string;

  @ApiProperty({
    description: "Refresh token for obtaining new access tokens",
    example: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  })
  refresh_token: string;

  @ApiProperty({
    description: "Token type",
    example: "Bearer",
    default: "Bearer",
  })
  token_type: string = "Bearer";

  @ApiProperty({
    description: "Access token expiration time in seconds",
    example: 900,
  })
  expires_in: number;

  @ApiProperty({
    description: "User information",
    type: "object",
    properties: {
      id: { type: "string", example: "f47ac10b-58cc-4372-a567-0e02b2c3d479" },
      email: { type: "string", example: "user@example.com" },
      displayName: { type: "string", example: "John Doe" },
    },
  })
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}
