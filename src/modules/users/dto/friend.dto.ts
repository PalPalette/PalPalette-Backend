import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class FriendDeviceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;
}

export class FriendDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional({ type: [FriendDeviceDto] })
  devices?: FriendDeviceDto[];
}
