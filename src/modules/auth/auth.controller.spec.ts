import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { RegisterUserDto } from "../users/dto/register-user.dto";
import { LoginUserDto } from "../users/dto/login-user.dto";

const mockUser = {
  id: "test-id",
  email: "test@example.com",
  passwordHash: "hashedpassword",
  displayName: "Test User",
};

const mockAuthResponse = {
  access_token: "jwt-token",
  user: mockUser,
};

describe("AuthController", () => {
  let controller: AuthController;
  let authService: AuthService;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue(mockAuthResponse),
          },
        },
        {
          provide: UsersService,
          useValue: {
            register: jest.fn().mockResolvedValue(mockUser),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should register a user", async () => {
    const dto: RegisterUserDto = {
      email: "test@example.com",
      password: "password123",
      displayName: "Test User",
    };
    expect(await controller.register(dto)).toEqual(mockUser);
    expect(usersService.register).toHaveBeenCalledWith(dto);
  });

  it("should login a user", async () => {
    const dto: LoginUserDto = {
      email: "test@example.com",
      password: "password123",
    };
    expect(await controller.login(dto)).toEqual(mockAuthResponse);
    expect(authService.login).toHaveBeenCalledWith(dto);
  });
});
