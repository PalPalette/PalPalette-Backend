import { IsString, IsEmail, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SendFriendRequestDto {
  @ApiProperty({
    example: "friend@example.com",
    description: "Email address of the user to send friend request to",
    format: "email",
  })
  @IsEmail()
  email: string;
}

export class RespondToFriendRequestDto {
  @ApiProperty({
    example: "uuid-string",
    description: "ID of the friendship request",
  })
  @IsString()
  friendshipId: string;

  @ApiProperty({
    example: "accept",
    description: "Action to take on the friend request",
    enum: ["accept", "decline"],
  })
  @IsString()
  @IsIn(["accept", "decline"])
  action: "accept" | "decline";
}
