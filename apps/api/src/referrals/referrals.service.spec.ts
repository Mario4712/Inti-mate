import { Test, TestingModule } from "@nestjs/testing";
import { ReferralsService } from "./referrals.service";
import { PrismaService } from "../common/database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";

// ─── Mocks ─────────────────────────────────────────────────

const mockPrisma: any = {
  referralCode: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  referral: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  userStreak: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  streakBadge: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  creatorBalance: {
    upsert: jest.fn(),
  },
  subscription: {
    findMany: jest.fn(),
  },
  subscriptionSlotConfig: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  $transaction: jest.fn((cb) =>
    typeof cb === "function" ? cb(mockPrisma) : Promise.all(cb),
  ),
};

const mockNotifications = {
  send: jest.fn().mockResolvedValue(undefined),
};

// ─── Test Suite ────────────────────────────────────────────

describe("ReferralsService", () => {
  let service: ReferralsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<ReferralsService>(ReferralsService);
  });

  // ─── getOrCreateCode() ─────────────────────────────────

  describe("getOrCreateCode", () => {
    it("should return existing referral code if user already has one", async () => {
      const existing = { userId: "user-1", code: "ALICE1234", creditBRL: 15 };
      mockPrisma.referralCode.findUnique.mockResolvedValue(existing);

      const result = await service.getOrCreateCode("user-1");

      expect(result).toEqual(existing);
      expect(mockPrisma.referralCode.create).not.toHaveBeenCalled();
    });

    it("should create a new referral code when user has none", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ username: "alice_dev" });
      mockPrisma.referralCode.create.mockResolvedValue({
        userId: "user-1",
        code: expect.any(String),
        creditBRL: 15,
      });

      const result = await service.getOrCreateCode("user-1");

      expect(mockPrisma.referralCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          creditBRL: 15,
          code: expect.any(String),
        }),
      });
    });

    it("should generate code from username prefix plus random suffix", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ username: "bob" });
      mockPrisma.referralCode.create.mockImplementation(({ data }: any) => {
        // Code should start with uppercase username and have 4-digit suffix
        expect(data.code).toMatch(/^BOB\d{4}$/);
        return Promise.resolve(data);
      });

      await service.getOrCreateCode("user-2");

      expect(mockPrisma.referralCode.create).toHaveBeenCalled();
    });

    it("should use userId fallback when user has no username", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ username: null });
      mockPrisma.referralCode.create.mockImplementation(({ data }: any) => {
        // Should use first 6 chars of userId as base
        expect(data.code.length).toBeGreaterThanOrEqual(5);
        return Promise.resolve(data);
      });

      await service.getOrCreateCode("abc123-uuid");

      expect(mockPrisma.referralCode.create).toHaveBeenCalled();
    });
  });

  // ─── applyReferralCode() ──────────────────────────────

  describe("applyReferralCode", () => {
    it("should apply referral code successfully", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue({
        userId: "referrer-1",
        code: "REF1234",
      });
      mockPrisma.referral.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.applyReferralCode("new-user-1", "REF1234");

      expect(result.ok).toBe(true);
      expect(result.message).toContain("Código aplicado");
    });

    it("should throw NotFoundException for invalid code", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue(null);

      await expect(
        service.applyReferralCode("new-user-1", "INVALID"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when user tries to use own code", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue({
        userId: "user-1",
        code: "SELF1234",
      });

      await expect(
        service.applyReferralCode("user-1", "SELF1234"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException when user already used a referral code", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue({
        userId: "referrer-1",
        code: "REF1234",
      });
      mockPrisma.referral.findUnique.mockResolvedValue({
        referredId: "new-user-1",
        referralCode: "PREV5678",
      });

      await expect(
        service.applyReferralCode("new-user-1", "REF1234"),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── grantReferralCredit() ────────────────────────────

  describe("grantReferralCredit", () => {
    it("should grant credit to referrer after first subscription", async () => {
      mockPrisma.referral.findUnique.mockResolvedValue({
        referredId: "referred-1",
        referrerId: "referrer-1",
        referralCode: "REF1234",
        creditAmount: 15,
        creditGranted: false,
      });
      mockPrisma.$transaction.mockResolvedValue([{}, {}, {}]);

      await service.grantReferralCredit("referred-1");

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should skip if no referral exists for user", async () => {
      mockPrisma.referral.findUnique.mockResolvedValue(null);

      await service.grantReferralCredit("no-referral-user");

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("should skip if credit was already granted", async () => {
      mockPrisma.referral.findUnique.mockResolvedValue({
        referredId: "referred-1",
        referrerId: "referrer-1",
        creditGranted: true,
      });

      await service.grantReferralCredit("referred-1");

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ─── recordActivity() (streaks) ───────────────────────

  describe("recordActivity", () => {
    it("should create a new streak record for first-time user", async () => {
      mockPrisma.userStreak.findUnique.mockResolvedValue(null);
      mockPrisma.userStreak.create.mockResolvedValue({
        userId: "user-1",
        currentStreak: 1,
        longestStreak: 1,
        totalDays: 1,
      });

      await service.recordActivity("user-1");

      expect(mockPrisma.userStreak.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          currentStreak: 1,
          longestStreak: 1,
          totalDays: 1,
        },
      });
    });

    it("should increment streak for consecutive day activity", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockPrisma.userStreak.findUnique.mockResolvedValue({
        userId: "user-1",
        currentStreak: 5,
        longestStreak: 10,
        totalDays: 20,
        lastActiveAt: yesterday,
      });
      mockPrisma.userStreak.update.mockResolvedValue({});
      mockPrisma.streakBadge.upsert.mockResolvedValue({});

      await service.recordActivity("user-1");

      expect(mockPrisma.userStreak.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: expect.objectContaining({
          currentStreak: 6,
          longestStreak: 10, // unchanged since 6 < 10
          totalDays: { increment: 1 },
        }),
      });
    });

    it("should reset streak when more than 1 day gap", async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      mockPrisma.userStreak.findUnique.mockResolvedValue({
        userId: "user-1",
        currentStreak: 15,
        longestStreak: 15,
        totalDays: 30,
        lastActiveAt: threeDaysAgo,
      });
      mockPrisma.userStreak.update.mockResolvedValue({});

      await service.recordActivity("user-1");

      expect(mockPrisma.userStreak.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: expect.objectContaining({
          currentStreak: 1, // reset to 1
          longestStreak: 15, // max(15, 1) = 15
        }),
      });
    });

    it("should not update if already active today (daysDiff === 0)", async () => {
      const now = new Date();

      mockPrisma.userStreak.findUnique.mockResolvedValue({
        userId: "user-1",
        currentStreak: 5,
        longestStreak: 5,
        totalDays: 10,
        lastActiveAt: now,
      });

      await service.recordActivity("user-1");

      expect(mockPrisma.userStreak.update).not.toHaveBeenCalled();
      expect(mockPrisma.userStreak.create).not.toHaveBeenCalled();
    });

    it("should update longestStreak when current exceeds it", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockPrisma.userStreak.findUnique.mockResolvedValue({
        userId: "user-1",
        currentStreak: 10,
        longestStreak: 10,
        totalDays: 20,
        lastActiveAt: yesterday,
      });
      mockPrisma.userStreak.update.mockResolvedValue({});
      mockPrisma.streakBadge.upsert.mockResolvedValue({});

      await service.recordActivity("user-1");

      expect(mockPrisma.userStreak.update).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        data: expect.objectContaining({
          currentStreak: 11,
          longestStreak: 11, // max(10, 11) = 11
        }),
      });
    });
  });

  // ─── getStreak() ───────────────────────────────────────

  describe("getStreak", () => {
    it("should return streak and badges for user", async () => {
      const streak = { userId: "user-1", currentStreak: 7, longestStreak: 30, totalDays: 50 };
      const badges = [
        { badgeType: "WEEK_1", discountPct: 0, earnedAt: new Date() },
      ];
      mockPrisma.userStreak.findUnique.mockResolvedValue(streak);
      mockPrisma.streakBadge.findMany.mockResolvedValue(badges);

      const result = await service.getStreak("user-1");

      expect(result.streak).toEqual(streak);
      expect(result.badges).toEqual(badges);
    });

    it("should return null streak when user has none", async () => {
      mockPrisma.userStreak.findUnique.mockResolvedValue(null);
      mockPrisma.streakBadge.findMany.mockResolvedValue([]);

      const result = await service.getStreak("user-1");

      expect(result.streak).toBeNull();
      expect(result.badges).toEqual([]);
    });
  });

  // ─── getStats() ────────────────────────────────────────

  describe("getStats", () => {
    it("should return referral statistics", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue({
        code: "ALICE1234",
        totalReferrals: 5,
        totalEarned: 75,
        referrals: [
          { createdAt: new Date(), creditGranted: true },
          { createdAt: new Date(), creditGranted: false },
        ],
      });

      const result = await service.getStats("user-1");

      expect(result).toEqual({
        code: "ALICE1234",
        link: "https://inti.mate/r/ALICE1234",
        totalReferrals: 5,
        totalEarned: 75,
        pending: 1,
      });
    });

    it("should return null when user has no referral code", async () => {
      mockPrisma.referralCode.findUnique.mockResolvedValue(null);

      const result = await service.getStats("user-1");

      expect(result).toBeNull();
    });
  });
});
