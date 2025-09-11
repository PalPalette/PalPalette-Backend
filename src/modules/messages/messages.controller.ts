import { Controller, Post, Body, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { MessagesService } from "./messages.service";
import { CreateMessageDto } from "./dto/create-message.dto";

@ApiTags("Messages")
@Controller("messages")
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: "Create a new message" })
  @ApiResponse({ status: 201, description: "Message created successfully" })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  async create(@Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.create(createMessageDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all messages (admin)" })
  @ApiResponse({
    status: 200,
    description: "All messages retrieved successfully",
  })
  async findAll() {
    return this.messagesService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get message by ID" })
  @ApiParam({ name: "id", description: "Message ID", example: "uuid-string" })
  @ApiResponse({ status: 200, description: "Message retrieved successfully" })
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
  @ApiResponse({ status: 200, description: "Messages retrieved successfully" })
  @ApiResponse({ status: 404, description: "Recipient not found" })
  async findByRecipient(@Param("recipientId") recipientId: string) {
    return this.messagesService.findByRecipient(recipientId);
  }
}
