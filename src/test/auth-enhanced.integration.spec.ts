import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import * as request from "supertest";
import { AuthService } from "../../src/modules/auth/auth.service";
import { AuthController } from "../../src/modules/auth/auth.controller";
import { RefreshToken } from "../../src/modules/auth/entities/refresh-token.entity";
import { UsersService } from "../../src/modules/users/users.service";
import { User } from "../../src/modules/users/entities/user.entity";
import { Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";

describe("Enhanced Authentication System (e2e)", () => {
  let app: INestApplication;
  let authService: AuthService;
  let userRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;

  const testUser = {
    id: "test-user-id",
    email: "test@example.com",
    displayName: "Test User",
    passwordHash:
      "$2b$12$LQv3c1yqBwEHxZLj.PH.h.YZn6/5QZpJz6/5QZpJz6/5QZpJz6/5QZ", // hashed 'password123'
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: "sqlite",
          database: ":memory:",
          entities: [User, RefreshToken],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User, RefreshToken]),
        JwtModule.register({
          secret: "test-secret",
          signOptions: { expiresIn: "15m" },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn().mockResolvedValue(testUser),
            findById: jest.fn().mockResolvedValue(testUser),
            register: jest
              .fn()
              .mockResolvedValue({ id: testUser.id, email: testUser.email }),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    authService = moduleFixture.get<AuthService>(AuthService);
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User)
    );
    refreshTokenRepository = moduleFixture.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken)
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear refresh tokens before each test
    await refreshTokenRepository.clear();
  });

  describe("POST /auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: "test@example.com",
          password: "password123",
          device_name: "Test Device",
        })
        .expect(200);

      expect(response.body).toHaveProperty("access_token");
      expect(response.body).toHaveProperty("refresh_token");
      expect(response.body).toHaveProperty("token_type", "Bearer");
      expect(response.body).toHaveProperty("expires_in", 900);
      expect(response.body.user).toEqual({
        id: testUser.id,
        email: testUser.email,
        displayName: testUser.displayName,
      });

      // Verify refresh token is stored in database
      const refreshTokens = await refreshTokenRepository.find();
      expect(refreshTokens).toHaveLength(1);
      expect(refreshTokens[0].deviceName).toBe("Test Device");
    });

    it("should fail with invalid credentials", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: "test@example.com",
          password: "wrongpassword",
        })
        .expect(401);
    });
  });

  describe("POST /auth/refresh", () => {
    let refreshToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: "test@example.com",
          password: "password123",
          device_name: "Test Device",
        });

      refreshToken = loginResponse.body.refresh_token;
    });

    it("should refresh tokens successfully with valid refresh token", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/refresh")
        .send({
          refresh_token: refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty("access_token");
      expect(response.body).toHaveProperty("refresh_token");
      expect(response.body.refresh_token).not.toBe(refreshToken); // Should be different (token rotation)
      expect(response.body.user).toEqual({
        id: testUser.id,
        email: testUser.email,
        displayName: testUser.displayName,
      });

      // Old refresh token should be revoked
      const oldToken = await refreshTokenRepository.findOne({
        where: { token: refreshToken },
      });
      expect(oldToken.isRevoked).toBe(true);
    });

    it("should fail with invalid refresh token", async () => {
      await request(app.getHttpServer())
        .post("/auth/refresh")
        .send({
          refresh_token: "invalid-token",
        })
        .expect(401);
    });

    it("should fail with revoked refresh token", async () => {
      // Revoke the token
      await refreshTokenRepository.update(
        { token: refreshToken },
        { isRevoked: true }
      );

      await request(app.getHttpServer())
        .post("/auth/refresh")
        .send({
          refresh_token: refreshToken,
        })
        .expect(401);
    });
  });

  describe("POST /auth/validate", () => {
    let accessToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: "test@example.com",
          password: "password123",
        });

      accessToken = loginResponse.body.access_token;
    });

    it("should validate valid token", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/validate")
        .send({
          token: accessToken,
        })
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.user).toEqual({
        id: testUser.id,
        email: testUser.email,
        displayName: testUser.displayName,
      });
    });

    it("should reject invalid token", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/validate")
        .send({
          token: "invalid-token",
        })
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.user).toBeUndefined();
    });
  });

  describe("Security Features", () => {
    it("should track device information in refresh tokens", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .set("User-Agent", "Test Browser/1.0")
        .send({
          email: "test@example.com",
          password: "password123",
          device_name: "Test Browser",
        })
        .expect(200);

      const refreshTokens = await refreshTokenRepository.find();
      expect(refreshTokens[0].deviceName).toBe("Test Browser");
      expect(refreshTokens[0].userAgent).toBe("Test Browser/1.0");
      expect(refreshTokens[0].deviceFingerprint).toBeDefined();
    });

    it("should revoke existing device tokens on new login", async () => {
      // First login
      await request(app.getHttpServer()).post("/auth/login").send({
        email: "test@example.com",
        password: "password123",
        device_name: "Test Device",
      });

      let tokens = await refreshTokenRepository.find({
        where: { isRevoked: false },
      });
      expect(tokens).toHaveLength(1);

      // Second login with same device name
      await request(app.getHttpServer()).post("/auth/login").send({
        email: "test@example.com",
        password: "password123",
        device_name: "Test Device",
      });

      tokens = await refreshTokenRepository.find({
        where: { isRevoked: false },
      });
      expect(tokens).toHaveLength(1); // Should still be 1 active token

      const revokedTokens = await refreshTokenRepository.find({
        where: { isRevoked: true },
      });
      expect(revokedTokens).toHaveLength(1); // Previous token should be revoked
    });
  });
});
