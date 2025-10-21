import {
  Controller,
  Post,
  Body,
  Inject,
  Request,
  UseGuards,
  Ip,
  Headers,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { Public } from "../../common/decorators/public.decorator";
import { AuthService } from "./auth.service";
import { LoginRequestDto } from "./dto/login-request.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ValidateTokenDto } from "./dto/validate-token.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { RegisterUserDto } from "../users/dto/register-user.dto";
import { UsersService } from "../users/users.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@ApiTags("Authentication")
@Controller("auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(UsersService) private readonly usersService: UsersService
  ) {}

  @Public()
  @Post("register")
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 attempts per minute
  @Throttle({ short: { limit: 1, ttl: 10000 } }) // 1 attempt per 10 seconds
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({
    status: 201,
    description: "User successfully registered and logged in",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request - validation error" })
  @ApiResponse({ status: 409, description: "User already exists" })
  @ApiResponse({ status: 429, description: "Too many requests" })
  async register(
    @Body() registerUserDto: RegisterUserDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string
  ): Promise<AuthResponseDto> {
    return this.authService.register(registerUserDto, ipAddress, userAgent);
  }

  @Public()
  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @Throttle({ short: { limit: 2, ttl: 10000 } }) // 2 attempts per 10 seconds
  @ApiOperation({ summary: "Login user and get access tokens" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @ApiResponse({ status: 429, description: "Too many requests" })
  async login(
    @Body() loginRequestDto: LoginRequestDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string
  ): Promise<AuthResponseDto> {
    return this.authService.login(loginRequestDto, ipAddress, userAgent);
  }

  @Public()
  @Post("refresh")
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute
  @ApiOperation({ summary: "Refresh access tokens using refresh token" })
  @ApiResponse({
    status: 200,
    description: "Tokens refreshed successfully",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Invalid refresh token" })
  @ApiResponse({ status: 429, description: "Too many requests" })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string
  ): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(
      refreshTokenDto.refresh_token,
      ipAddress,
      userAgent
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout user and invalidate tokens" })
  @ApiResponse({ status: 200, description: "Logout successful" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async logout(@Request() req, @Body() body?: { refresh_token?: string }) {
    return this.authService.logout(req.user.userId, body?.refresh_token);
  }

  @Public()
  @Post("validate")
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 attempts per minute
  @ApiOperation({ summary: "Validate an access token" })
  @ApiResponse({ status: 200, description: "Token validation result" })
  @ApiResponse({ status: 429, description: "Too many requests" })
  async validate(@Body() validateTokenDto: ValidateTokenDto) {
    return this.authService.validateToken(validateTokenDto.token);
  }

  @UseGuards(JwtAuthGuard)
  @Post("revoke-device")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke access for a specific device" })
  @ApiResponse({ status: 200, description: "Device access revoked" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async revokeDevice(@Request() req, @Body() body: { device_name: string }) {
    await this.authService.revokeDeviceAccess(
      req.user.userId,
      body.device_name
    );
    return { success: true, message: "Device access revoked" };
  }

  @UseGuards(JwtAuthGuard)
  @Post("sessions")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get active sessions for the current user" })
  @ApiResponse({
    status: 200,
    description: "Active sessions retrieved",
    schema: {
      type: "object",
      properties: {
        sessions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", example: "session-uuid" },
              deviceName: { type: "string", example: "My iPhone" },
              ipAddress: { type: "string", example: "192.168.1.100" },
              userAgent: { type: "string", example: "Mozilla/5.0..." },
              createdAt: {
                type: "string",
                format: "date-time",
                example: "2025-10-21T12:00:00Z",
              },
              lastUsedAt: {
                type: "string",
                format: "date-time",
                example: "2025-10-21T14:30:00Z",
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getActiveSessions(@Request() req) {
    const sessions = await this.authService.getActiveSessions(req.user.userId);
    return { sessions };
  }
}
