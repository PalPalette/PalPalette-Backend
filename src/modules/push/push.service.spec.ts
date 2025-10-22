import { Test, TestingModule } from "@nestjs/testing";
import { PushService } from "./push.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { PushSubscription } from "./entities/push-subscription.entity";
import { User } from "../users/entities/user.entity";
import { Repository } from "typeorm";

describe("PushService", () => {
  let service: PushService;
  let subscriptionRepository: Repository<PushSubscription>;
  let userRepository: Repository<User>;

  const mockSubscriptionRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushService,
        {
          provide: getRepositoryToken(PushSubscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<PushService>(PushService);
    subscriptionRepository = module.get<Repository<PushSubscription>>(
      getRepositoryToken(PushSubscription)
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("registerToken", () => {
    it("should create a new subscription when token does not exist", async () => {
      const userId = "user-123";
      const token = "fcm-token-123";
      const platform = "android";

      const mockUser = { id: userId, email: "test@example.com" } as User;
      const mockSubscription = {
        id: "sub-123",
        user: mockUser,
        token,
        platform,
        enabled: true,
      } as PushSubscription;

      mockSubscriptionRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockSubscriptionRepository.create.mockReturnValue(mockSubscription);
      mockSubscriptionRepository.save.mockResolvedValue(mockSubscription);

      const result = await service.registerToken(userId, token, platform);

      expect(result).toEqual(mockSubscription);
      expect(mockSubscriptionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          token,
          platform,
          enabled: true,
        })
      );
    });

    it("should update existing subscription when token already exists", async () => {
      const userId = "user-123";
      const token = "fcm-token-123";
      const platform = "android";

      const mockUser = { id: userId, email: "test@example.com" } as User;
      const existingSubscription = {
        id: "sub-123",
        user: { id: "old-user" } as User,
        token,
        platform: "ios",
        enabled: false,
      } as PushSubscription;

      mockSubscriptionRepository.findOne.mockResolvedValue(
        existingSubscription
      );
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockSubscriptionRepository.save.mockResolvedValue({
        ...existingSubscription,
        user: mockUser,
        platform,
        enabled: true,
      });

      const result = await service.registerToken(userId, token, platform);

      expect(result.user).toEqual(mockUser);
      expect(result.platform).toEqual(platform);
      expect(result.enabled).toBe(true);
    });

    it("should throw error when user not found", async () => {
      const userId = "user-123";
      const token = "fcm-token-123";
      const platform = "android";

      mockSubscriptionRepository.findOne.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.registerToken(userId, token, platform)
      ).rejects.toThrow("User not found");
    });
  });

  describe("unregisterToken", () => {
    it("should remove subscription when token exists", async () => {
      const token = "fcm-token-123";
      const mockSubscription = {
        id: "sub-123",
        token,
      } as PushSubscription;

      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      mockSubscriptionRepository.remove.mockResolvedValue(mockSubscription);

      const result = await service.unregisterToken(token);

      expect(result).toBe(true);
      expect(mockSubscriptionRepository.remove).toHaveBeenCalledWith(
        mockSubscription
      );
    });

    it("should return false when token does not exist", async () => {
      const token = "fcm-token-123";

      mockSubscriptionRepository.findOne.mockResolvedValue(null);

      const result = await service.unregisterToken(token);

      expect(result).toBe(false);
      expect(mockSubscriptionRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe("getUserSubscriptions", () => {
    it("should return all active subscriptions for a user", async () => {
      const userId = "user-123";
      const mockSubscriptions = [
        { id: "sub-1", platform: "android", enabled: true },
        { id: "sub-2", platform: "ios", enabled: true },
      ] as PushSubscription[];

      mockSubscriptionRepository.find.mockResolvedValue(mockSubscriptions);

      const result = await service.getUserSubscriptions(userId);

      expect(result).toEqual(mockSubscriptions);
      expect(mockSubscriptionRepository.find).toHaveBeenCalledWith({
        where: { user: { id: userId }, enabled: true },
        order: { lastSeenAt: "DESC" },
      });
    });
  });

  describe("sendToUser", () => {
    it("should skip sending when FCM is not initialized", async () => {
      const userId = "user-123";
      const payload = {
        title: "Test",
        body: "Test message",
      };

      // FCM is not initialized in test environment
      const result = await service.sendToUser(userId, payload);

      expect(result).toEqual({
        success: false,
        sentCount: 0,
        failedCount: 0,
      });
    });

    it("should return success with 0 count when user has no subscriptions", async () => {
      const userId = "user-123";
      const payload = {
        title: "Test",
        body: "Test message",
      };

      mockSubscriptionRepository.find.mockResolvedValue([]);

      const result = await service.sendToUser(userId, payload);

      expect(result).toEqual({
        success: true,
        sentCount: 0,
        failedCount: 0,
      });
    });
  });
});
