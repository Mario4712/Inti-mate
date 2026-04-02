import { Test, TestingModule } from "@nestjs/testing";
import { SubscriptionsService } from "./subscriptions.service";
import { PrismaService } from "../common/database/prisma.service";
import { PaymentsService } from "../payments/payments.service";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

// ─── Mocks ─────────────────────────────────────────────────

const mockPrisma = {
  creatorPlan: {
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockPayments = {
  createSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
};

// ─── Test Suite ────────────────────────────────────────────

describe("SubscriptionsService", () => {
  let service: SubscriptionsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentsService, useValue: mockPayments },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  // ─── createPlan() ──────────────────────────────────────

  describe("createPlan", () => {
    const planDto = {
      name: "Premium",
      description: "Acesso completo",
      monthlyPrice: 29.9,
    };

    it("should create a plan successfully", async () => {
      mockPrisma.creatorPlan.count.mockResolvedValue(0);
      mockPrisma.creatorPlan.create.mockResolvedValue({
        id: "plan-1",
        creatorId: "creator-1",
        ...planDto,
      });

      const result = await service.createPlan("creator-1", planDto);

      expect(result.id).toBe("plan-1");
      expect(mockPrisma.creatorPlan.create).toHaveBeenCalledWith({
        data: { ...planDto, creatorId: "creator-1" },
      });
    });

    it("should throw if creator already has 3 plans", async () => {
      mockPrisma.creatorPlan.count.mockResolvedValue(3);

      await expect(service.createPlan("creator-1", planDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── updatePlan() ──────────────────────────────────────

  describe("updatePlan", () => {
    it("should update a plan", async () => {
      mockPrisma.creatorPlan.findFirst.mockResolvedValue({ id: "plan-1", creatorId: "creator-1" });
      mockPrisma.creatorPlan.update.mockResolvedValue({ id: "plan-1", name: "VIP" });

      const result = await service.updatePlan("creator-1", "plan-1", { name: "VIP" });

      expect(result.name).toBe("VIP");
    });

    it("should throw NotFoundException if plan not found", async () => {
      mockPrisma.creatorPlan.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePlan("creator-1", "bad-id", { name: "VIP" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deactivatePlan() ──────────────────────────────────

  describe("deactivatePlan", () => {
    it("should deactivate plan and cancel active subscriptions", async () => {
      mockPrisma.creatorPlan.findFirst.mockResolvedValue({ id: "plan-1", creatorId: "creator-1" });
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.creatorPlan.update.mockResolvedValue({ id: "plan-1", isActive: false });

      const result = await service.deactivatePlan("creator-1", "plan-1");

      expect(result.isActive).toBe(false);
      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith({
        where: { planId: "plan-1", status: "ACTIVE" },
        data: expect.objectContaining({
          status: "CANCELLED",
          cancellationReason: "Plano desativado pelo criador",
        }),
      });
    });

    it("should throw NotFoundException if plan not found", async () => {
      mockPrisma.creatorPlan.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivatePlan("creator-1", "bad-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getCreatorPlans() ─────────────────────────────────

  describe("getCreatorPlans", () => {
    it("should return active plans sorted by price", async () => {
      const plans = [
        { id: "1", monthlyPrice: 10 },
        { id: "2", monthlyPrice: 20 },
      ];
      mockPrisma.creatorPlan.findMany.mockResolvedValue(plans);

      const result = await service.getCreatorPlans("creator-1");

      expect(result).toHaveLength(2);
      expect(mockPrisma.creatorPlan.findMany).toHaveBeenCalledWith({
        where: { creatorId: "creator-1", isActive: true },
        orderBy: { monthlyPrice: "asc" },
      });
    });
  });

  // ─── subscribe() ───────────────────────────────────────

  describe("subscribe", () => {
    it("should delegate to payments service", async () => {
      mockPrisma.creatorPlan.findUnique.mockResolvedValue({
        id: "plan-1",
        creatorId: "creator-1",
      });
      mockPayments.createSubscription.mockResolvedValue({ id: "sub-1" });

      const result = await service.subscribe("fan-1", "plan-1", "pagarme", "tok_123");

      expect(result.id).toBe("sub-1");
      expect(mockPayments.createSubscription).toHaveBeenCalledWith(
        "fan-1",
        "plan-1",
        { provider: "pagarme", token: "tok_123" },
      );
    });

    it("should throw if plan not found", async () => {
      mockPrisma.creatorPlan.findUnique.mockResolvedValue(null);

      await expect(
        service.subscribe("fan-1", "bad-plan", "stripe", "tok"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw if user tries to subscribe to themselves", async () => {
      mockPrisma.creatorPlan.findUnique.mockResolvedValue({
        id: "plan-1",
        creatorId: "same-user",
      });

      await expect(
        service.subscribe("same-user", "plan-1", "stripe", "tok"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── checkAccess() ─────────────────────────────────────

  describe("checkAccess", () => {
    it("should return true if active subscription exists", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ id: "sub-1" });

      const result = await service.checkAccess("fan-1", "creator-1");

      expect(result).toBe(true);
    });

    it("should return false if no active subscription", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      const result = await service.checkAccess("fan-1", "creator-1");

      expect(result).toBe(false);
    });
  });

  // ─── getCreatorSubscribers() ───────────────────────────

  describe("getCreatorSubscribers", () => {
    it("should return paginated subscribers", async () => {
      mockPrisma.$transaction.mockResolvedValue([
        [{ id: "sub-1" }, { id: "sub-2" }],
        5,
      ]);

      const result = await service.getCreatorSubscribers("creator-1", 1, 20);

      expect(result.items).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 5,
        pages: 1,
      });
    });
  });
});
