import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";
import { Repository, LessThan, DataSource } from "typeorm";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { LoginRequestDto } from "./dto/login-request.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { RegisterUserDto } from "../users/dto/register-user.dto";
import { RefreshToken } from "./entities/refresh-token.entity";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly ACCESS_TOKEN_EXPIRY = "15m";
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 7;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {
    // Clean up expired refresh tokens every hour
    setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const isMatch = await this.usersService.validatePassword(
      password,
      user.passwordHash
    );
    if (!isMatch) return null;

    return user;
  }

  async register(
    registerUserDto: RegisterUserDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      try {
        // Create the user using the users service
        const user = await this.usersService.register(registerUserDto);

        // Generate tokens for immediate login within the transaction
        const tokens = await this.generateTokenPairWithManager(
          manager,
          user,
          registerUserDto.device_name,
          ipAddress,
          userAgent
        );

        this.logger.log(
          `User ${user.id} registered and logged in successfully`
        );

        return {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          token_type: "Bearer",
          expires_in: 900, // 15 minutes in seconds
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
          },
        };
      } catch (error) {
        this.logger.error(`Registration failed: ${error.message}`, error.stack);
        throw error;
      }
    });
  }

  async login(
    loginRequestDto: LoginRequestDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponseDto> {
    const user = await this.validateUser(
      loginRequestDto.email,
      loginRequestDto.password
    );

    if (!user) {
      this.logger.warn(
        `Failed login attempt for email: ${loginRequestDto.email}`
      );
      throw new UnauthorizedException("Invalid credentials");
    }

    // Revoke existing refresh tokens for this device if any
    if (loginRequestDto.device_name) {
      await this.revokeDeviceTokens(user.id, loginRequestDto.device_name);
    }

    const tokens = await this.generateTokenPair(
      user,
      loginRequestDto.device_name,
      ipAddress,
      userAgent
    );

    this.logger.log(`User ${user.id} logged in successfully`);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: "Bearer",
      expires_in: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
  }

  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponseDto> {
    const tokenEntity = await this.validateRefreshToken(refreshToken);

    if (!tokenEntity) {
      this.logger.warn(
        `Invalid refresh token used: ${refreshToken.substring(0, 10)}...`
      );
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.usersService.findById(tokenEntity.userId);
    if (!user) {
      this.logger.warn(
        `User not found for refresh token: ${tokenEntity.userId}`
      );
      throw new UnauthorizedException("User not found");
    }

    // Update last used timestamp
    tokenEntity.lastUsedAt = new Date();
    await this.refreshTokenRepository.save(tokenEntity);

    // Generate new token pair (this will revoke the old refresh token)
    const tokens = await this.generateTokenPair(
      user,
      tokenEntity.deviceName,
      ipAddress,
      userAgent
    );

    // Revoke the old refresh token
    await this.revokeRefreshToken(refreshToken);

    this.logger.log(`Tokens refreshed for user ${user.id}`);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: "Bearer",
      expires_in: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    };
  }

  async logout(
    userId: string,
    refreshToken?: string
  ): Promise<{ success: boolean }> {
    if (refreshToken) {
      await this.revokeRefreshToken(refreshToken);
    } else {
      // Revoke all refresh tokens for the user
      await this.revokeAllUserTokens(userId);
    }

    this.logger.log(`User ${userId} logged out`);
    return { success: true };
  }

  async validateToken(token: string): Promise<{ valid: boolean; user?: any }> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        return { valid: false };
      }

      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
      };
    } catch (error) {
      this.logger.debug(`Token validation failed: ${error.message}`);
      return { valid: false };
    }
  }

  private async generateTokenPair(
    user: any,
    deviceName?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshTokenValue = this.generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: refreshTokenValue,
      userId: user.id,
      deviceName,
      ipAddress,
      userAgent,
      expiresAt,
      deviceFingerprint: this.generateDeviceFingerprint(
        deviceName,
        userAgent,
        ipAddress
      ),
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  private async generateTokenPairWithManager(
    manager: any,
    user: any,
    deviceName?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshTokenValue = this.generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    const refreshTokenEntity = manager.create(RefreshToken, {
      token: refreshTokenValue,
      userId: user.id,
      deviceName,
      ipAddress,
      userAgent,
      expiresAt,
      deviceFingerprint: this.generateDeviceFingerprint(
        deviceName,
        userAgent,
        ipAddress
      ),
    });

    await manager.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  private async validateRefreshToken(
    token: string
  ): Promise<RefreshToken | null> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: {
        token,
        isRevoked: false,
      },
      relations: ["user"],
    });

    // Check if token exists and is not expired
    if (!refreshToken || new Date() > refreshToken.expiresAt) {
      return null;
    }

    return refreshToken;
  }

  private async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { token },
      { isRevoked: true, deletedAt: new Date() }
    );
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true, deletedAt: new Date() }
    );
  }

  private async revokeDeviceTokens(
    userId: string,
    deviceName: string
  ): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, deviceName, isRevoked: false },
      { isRevoked: true, deletedAt: new Date() }
    );
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private generateDeviceFingerprint(
    deviceName?: string,
    userAgent?: string,
    ipAddress?: string
  ): string {
    const data = `${deviceName || ""}:${userAgent || ""}:${ipAddress || ""}`;
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  private async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await this.refreshTokenRepository.delete({
        expiresAt: LessThan(new Date()),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(`Cleaned up ${result.affected} expired refresh tokens`);
      }
    } catch (error) {
      this.logger.error("Failed to cleanup expired tokens", error);
    }
  }

  // Method to revoke tokens by device (useful for security)
  async revokeDeviceAccess(userId: string, deviceName: string): Promise<void> {
    await this.revokeDeviceTokens(userId, deviceName);
    this.logger.log(
      `Revoked device access for user ${userId}, device: ${deviceName}`
    );
  }

  // Method to get active sessions for a user
  async getActiveSessions(userId: string): Promise<Partial<RefreshToken>[]> {
    const sessions = await this.refreshTokenRepository.find({
      where: { userId, isRevoked: false },
      select: ["deviceName", "ipAddress", "createdAt", "lastUsedAt"],
      order: { lastUsedAt: "DESC" },
    });

    return sessions;
  }
}
