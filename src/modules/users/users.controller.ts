import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Put,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UsersService } from "./users.service";
import { FriendsService } from "./friends.service";
import { ColorPalettesService } from "./color-palettes.service";
import { RegisterUserDto } from "./dto/register-user.dto";
import {
  SendFriendRequestDto,
  RespondToFriendRequestDto,
} from "./dto/friendship.dto";
import {
  CreateColorPaletteDto,
  UpdateColorPaletteDto,
  SendPaletteToFriendsDto,
} from "./dto/color-palette.dto";
import {
  SetMessageTimeframeDto,
  MessageTimeframeResponseDto,
} from "./dto/message-timeframe.dto";
import { ReplayMessageOnDeviceDto } from "./dto/replay-message.dto";
import { FriendDto } from "./dto/friend.dto";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly friendsService: FriendsService,
    private readonly palettesService: ColorPalettesService
  ) {}

  @Post("register")
  @ApiOperation({
    summary: "Register a new user (deprecated - use /auth/register)",
  })
  @ApiResponse({ status: 201, description: "User successfully registered" })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 409, description: "User already exists" })
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.usersService.register(registerUserDto);
  }

  // Friends endpoints - must come before :id route
  @UseGuards(JwtAuthGuard)
  @Post("friends/request")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Send a friend request" })
  @ApiResponse({ status: 201, description: "Friend request sent successfully" })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Target user not found" })
  async sendFriendRequest(@Request() req, @Body() dto: SendFriendRequestDto) {
    return this.friendsService.sendFriendRequest(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("friends/respond")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Respond to a friend request" })
  @ApiResponse({ status: 200, description: "Response recorded successfully" })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Friend request not found" })
  async respondToFriendRequest(
    @Request() req,
    @Body() dto: RespondToFriendRequestDto
  ) {
    return this.friendsService.respondToFriendRequest(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("friends")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get list of friends (optionally with devices)" })
  @ApiResponse({
    status: 200,
    description:
      "List of friends retrieved successfully. If includeDevices=true, each friend will include a devices array.",
    type: [FriendDto],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiQuery({
    name: "includeDevices",
    required: false,
    type: Boolean,
    description:
      "If true, each friend will include a devices array with their devices. If false or omitted, devices will be an empty array.",
  })
  async getFriends(@Request() req): Promise<FriendDto[]> {
    // Check for ?includeDevices=true
    const includeDevices = req.query?.includeDevices === "true";
    const friends = await this.friendsService.getFriends(req.user.userId);
    if (!includeDevices) {
      // Only return safe fields
      return friends.map((friend) => ({
        id: friend.id,
        displayName: friend.displayName,
        email: friend.email,
        devices: [], // Always present, even if empty
      }));
    }
    // With devices
    return this.friendsService.getFriendsWithDevices(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("friends/pending")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get pending friend requests received" })
  @ApiResponse({
    status: 200,
    description: "Pending requests retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getPendingRequests(@Request() req) {
    return this.friendsService.getPendingRequests(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("friends/sent")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get friend requests sent by user" })
  @ApiResponse({
    status: 200,
    description: "Sent requests retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getSentRequests(@Request() req) {
    return this.friendsService.getSentRequests(req.user.userId);
  }

  // Color palettes endpoints - must come before :id route
  @UseGuards(JwtAuthGuard)
  @Post("palettes")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new color palette" })
  @ApiResponse({
    status: 201,
    description: "Color palette created successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createPalette(@Request() req, @Body() dto: CreateColorPaletteDto) {
    return this.palettesService.create(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("palettes")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user's color palettes" })
  @ApiResponse({
    status: 200,
    description: "User palettes retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getUserPalettes(@Request() req) {
    return this.palettesService.findUserPalettes(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("palettes/send")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Send a color palette to friends" })
  @ApiResponse({
    status: 200,
    description: "Palette sent to friends successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Palette not found" })
  async sendPaletteToFriends(
    @Request() req,
    @Body() dto: SendPaletteToFriendsDto
  ) {
    return this.palettesService.sendPaletteToFriends(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("palettes/:id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a specific color palette by ID" })
  @ApiParam({
    name: "id",
    description: "Color palette ID",
    example: "uuid-string",
  })
  @ApiResponse({
    status: 200,
    description: "Color palette retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Palette not found" })
  async getPalette(@Param("id") id: string) {
    return this.palettesService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("palettes/:id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a color palette" })
  @ApiParam({
    name: "id",
    description: "Color palette ID",
    example: "uuid-string",
  })
  @ApiResponse({
    status: 200,
    description: "Color palette updated successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - not palette owner" })
  @ApiResponse({ status: 404, description: "Palette not found" })
  async updatePalette(
    @Request() req,
    @Param("id") id: string,
    @Body() dto: UpdateColorPaletteDto
  ) {
    return this.palettesService.update(req.user.userId, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("palettes/:id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a color palette" })
  @ApiParam({
    name: "id",
    description: "Color palette ID",
    example: "uuid-string",
  })
  @ApiResponse({
    status: 200,
    description: "Color palette deleted successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - not palette owner" })
  @ApiResponse({ status: 404, description: "Palette not found" })
  async deletePalette(@Request() req, @Param("id") id: string) {
    return this.palettesService.delete(req.user.userId, id);
  }

  // Messages endpoints for missed messages functionality - must come BEFORE :id route
  @UseGuards(JwtAuthGuard)
  @Get("messages")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get received messages for user" })
  @ApiResponse({ status: 200, description: "Messages retrieved successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getReceivedMessages(@Request() req) {
    // This will be implemented in MessagesService via UsersService
    return this.usersService.getReceivedMessages(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("messages/undelivered")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get undelivered messages for user" })
  @ApiResponse({
    status: 200,
    description: "Undelivered messages retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getUndeliveredMessages(@Request() req) {
    return this.usersService.getUndeliveredMessages(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("messages/:messageId/replay")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Replay a message on a specific device" })
  @ApiParam({
    name: "messageId",
    description: "Message ID to replay",
    example: "uuid-string",
  })
  @ApiResponse({ status: 200, description: "Message replayed successfully" })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Message or device not found" })
  async replayMessage(
    @Request() req,
    @Param("messageId") messageId: string,
    @Body() body: ReplayMessageOnDeviceDto
  ) {
    return this.usersService.replayMessageOnDevice(
      req.user.userId,
      messageId,
      body.deviceId
    );
  }

  // Message timeframe endpoints - must come before :id route
  @UseGuards(JwtAuthGuard)
  @Put("message-timeframe")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Set user's message receiving timeframe" })
  @ApiResponse({
    status: 200,
    description: "Message timeframe updated successfully",
    type: MessageTimeframeResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async setMessageTimeframe(
    @Request() req,
    @Body() dto: SetMessageTimeframeDto
  ): Promise<MessageTimeframeResponseDto> {
    return this.usersService.setMessageTimeframe(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("message-timeframe")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user's message receiving timeframe" })
  @ApiResponse({
    status: 200,
    description: "Message timeframe retrieved successfully",
    type: MessageTimeframeResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMessageTimeframe(
    @Request() req
  ): Promise<MessageTimeframeResponseDto> {
    return this.usersService.getMessageTimeframe(req.user.userId);
  }

  // Generic user routes - must come AFTER specific routes
  @Get(":id")
  @ApiOperation({ summary: "Get user by ID (public)" })
  @ApiParam({ name: "id", description: "User ID", example: "uuid-string" })
  @ApiResponse({ status: 200, description: "User retrieved successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  async getUser(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user profile" })
  @ApiParam({ name: "id", description: "User ID", example: "uuid-string" })
  @ApiResponse({ status: 200, description: "Profile updated successfully" })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - not profile owner" })
  @ApiResponse({ status: 404, description: "User not found" })
  async updateProfile(@Param("id") id: string, @Body() update: Partial<any>) {
    return this.usersService.updateProfile(id, update);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete user account" })
  @ApiParam({ name: "id", description: "User ID", example: "uuid-string" })
  @ApiResponse({ status: 200, description: "User deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - not account owner" })
  @ApiResponse({ status: 404, description: "User not found" })
  async remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}
