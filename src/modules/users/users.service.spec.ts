import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { Repository } from "typeorm";
import { RegisterUserDto } from "./dto/register-user.dto";
import { MessagesService } from "../messages/messages.service";
import { MessagesGateway } from "../messages/messages.gateway";
import * as bcrypt from "bcrypt";

const mockUser = {
  id: "test-id",
  email: "test@example.com",
  passwordHash: "hashedpassword",
  displayName: "Test User",
  createdAt: new Date(),
  updatedAt: new Date(),
  devices: [],
  sentMessages: [],
  receivedMessages: [],
};

describe("UsersService", () => {
  let service: UsersService;
  let repo: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn().mockReturnValue(mockUser),
            save: jest.fn().mockResolvedValue(mockUser),
            findOne: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue({}),
            delete: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: MessagesService,
          useValue: {
            create: jest.fn(),
            findByRecipient: jest.fn(),
          },
        },
        {
          provide: MessagesGateway,
          useValue: {
            emitNewMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should register a user", async () => {
    (jest.spyOn(bcrypt, "hash") as any).mockResolvedValueOnce("hashedpassword");
    const dto: RegisterUserDto = {
      email: "test@example.com",
      password: "password123",
      displayName: "Test User",
    };
    expect(await service.register(dto)).toEqual(mockUser);
    expect(repo.create).toHaveBeenCalledWith({
      email: dto.email,
      passwordHash: "hashedpassword",
      displayName: dto.displayName,
    });
    expect(repo.save).toHaveBeenCalledWith(mockUser);
  });

  it("should find user by email", async () => {
    expect(await service.findByEmail("test@example.com")).toEqual(mockUser);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });
  });

  it("should find user by id", async () => {
    expect(await service.findById("test-id")).toEqual(mockUser);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: "test-id" } });
  });

  it("should update profile", async () => {
    jest.spyOn(service, "findById").mockResolvedValue(mockUser);
    expect(
      await service.updateProfile("test-id", { displayName: "New Name" })
    ).toEqual(mockUser);
    expect(repo.update).toHaveBeenCalledWith("test-id", {
      displayName: "New Name",
    });
  });

  it("should remove user", async () => {
    await service.remove("test-id");
    expect(repo.delete).toHaveBeenCalledWith("test-id");
  });
});
