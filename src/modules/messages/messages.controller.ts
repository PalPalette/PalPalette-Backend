import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { MessagesService } from "./messages.service";
import { CreateMessageDto } from "./dto/create-message.dto";
import { MessageResponseDto } from "./dto/message-response.dto";
import { ReplayMessageResponseDto } from "./dto/replay-message-response.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("Messages")
@Controller("messages")
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: "Create a new message" })
  @ApiResponse({
    status: 201,
    description: "Message created successfully",
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  async create(@Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.create(createMessageDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all messages (admin)" })
  @ApiResponse({
    status: 200,
    description: "All messages retrieved successfully",
    type: [MessageResponseDto],
  })
  async findAll() {
    return this.messagesService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get message by ID" })
  @ApiParam({ name: "id", description: "Message ID", example: "uuid-string" })
  @ApiResponse({
    status: 200,
    description: "Message retrieved successfully",
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 404, description: "Message not found" })
  async findById(@Param("id") id: string) {
    return this.messagesService.findById(id);
  }

  @Get("/recipient/:recipientId")
  @ApiOperation({ summary: "Get messages for a specific recipient" })
  @ApiParam({
    name: "recipientId",
    description: "Recipient user ID",
    example: "uuid-string",
  })
  @ApiResponse({
    status: 200,
    description: "Messages retrieved successfully",
    type: [MessageResponseDto],
  })
  @ApiResponse({ status: 404, description: "Recipient not found" })
  async findByRecipient(@Param("recipientId") recipientId: string) {
    return this.messagesService.findByRecipient(recipientId);
  }

  @Post(":id/replay")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Replay a message on the user's lighting system",
    description:
      "Sends a previously received message to the user's lighting system for display. This is a deliberate action by the user to review a message, so it bypasses the user's configured messaging timeframe.",
  })
  @ApiParam({
    name: "id",
    description: "Message ID to replay",
    example: "uuid-string",
  })
  @ApiResponse({
    status: 200,
    description: "Message replayed successfully",
    type: ReplayMessageResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Message not found",
  })
  @ApiResponse({
    status: 403,
    description: "Unauthorized - You can only replay messages sent to you",
  })
  async replayMessage(@Param("id") id: string, @Request() req) {
    return this.messagesService.replayMessage(id, req.user.userId);
  }
}
