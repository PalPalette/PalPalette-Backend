import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { LoginUserDto } from "../users/dto/login-user.dto";
import * as bcrypt from "bcrypt";
import { UnauthorizedException } from "@nestjs/common";

const mockUser = {
  id: "test-id",
  email: "test@example.com",
  passwordHash: "hashedpassword",
  displayName: "Test User",
};

const mockJwt = "jwt-token";

describe("AuthService", () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue(mockJwt),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should validate user with correct credentials", async () => {
    (jest.spyOn(bcrypt, "compare") as any).mockResolvedValueOnce(true);
    const user = await service.validateUser("test@example.com", "password123");
    expect(user).toEqual(mockUser);
    expect(usersService.findByEmail).toHaveBeenCalledWith("test@example.com");
  });

  it("should return null for invalid password", async () => {
    (jest.spyOn(bcrypt, "compare") as any).mockResolvedValueOnce(false);
    const user = await service.validateUser(
      "test@example.com",
      "wrongpassword"
    );
    expect(user).toBeNull();
  });

  it("should throw UnauthorizedException for invalid login", async () => {
    (jest.spyOn(service, "validateUser") as any).mockResolvedValueOnce(null);
    await expect(
      service.login({ email: "test@example.com", password: "wrongpassword" })
    ).rejects.toThrow(UnauthorizedException);
  });

  it("should return JWT and user for valid login", async () => {
    (jest.spyOn(service, "validateUser") as any).mockResolvedValueOnce(
      mockUser
    );
    const result = await service.login({
      email: "test@example.com",
      password: "password123",
    });
    expect(result).toEqual({ access_token: mockJwt, user: mockUser });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: mockUser.id,
      email: mockUser.email,
    });
  });
});
