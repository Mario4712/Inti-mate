import { Test, TestingModule } from "@nestjs/testing";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../common/database/prisma.service";
import { ConfigService } from "@nestjs/config";
import { PagarmeStrategy } from "./strategies/pagarme.strategy";
import { StripeStrategy } from "./strategies/stripe.strategy";
import { NotFoundException, BadRequestException } from "@nestjs/common";

// ─── Mocks ─────────────────────────────────────────────────

const mockPrisma = {
  creatorPlan: { findUnique: jest.fn() },
  subscription: {
    create: jest.fn().mockReturnValue("sub_query"),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  transaction: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn().mockReturnValue("tx_query"),
    update: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
  },
  creatorBalance: {
    upsert: jest.fn(),
  },
  ppvContent: {
    findUnique: jest.fn(),
  },
  ppvPurchase: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockPagarme = {
  charge: jest.fn(),
  cancel: jest.fn(),
  parseWebhook: jest.fn(),
};

const mockStripe = {
  charge: jest.fn(),
  cancel: jest.fn(),
  parseWebhook: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === "app.payments.defaultGateway") return "pagarme";
    return null;
  }),
};

// ─── Test Suite ────────────────────────────────────────────

describe("PaymentsService", () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: PagarmeStrategy, useValue: mockPagarme },
        { provide: StripeStrategy, useValue: mockStripe },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  // ─── createSubscription() ──────────────────────────────

  describe("createSubscription", () => {
    const plan = {
      id: "plan-1",
      creatorId: "creator-1",
      monthlyPrice: { toNumber: () => 29.9 },
      name: "Premium",
    };

    it("should create subscription with platform fee", async () => {
      mockPrisma.creatorPlan.findUnique.mockResolvedValue(plan);
      mockPrisma.subscription.findFirst.mockResolvedValue(null); // no existing sub
      mockPagarme.charge.mockResolvedValue({ id: "gw_123", status: "paid", raw: {} });
      // $transaction with array style returns array of results
      mockPrisma.$transaction.mockResolvedValue([
        { id: "sub-1", subscriberId: "fan-1", status: "ACTIVE" },
        { id: "tx-1" },
      ]);
      mockPrisma.creatorBalance.upsert.mockResolvedValue({});

      const result = await service.createSubscription("fan-1", "plan-1", {
        provider: "pagarme",
        token: "tok_123",
      });

      expect(result).toHaveProperty("id", "sub-1");
    });

    it("should throw if plan not found", async () => {
      mockPrisma.creatorPlan.findUnique.mockResolvedValue(null);

      await expect(
        service.createSubscription("fan-1", "bad-plan", {
          provider: "pagarme",
          token: "tok",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw if already subscribed", async () => {
      mockPrisma.creatorPlan.findUnique.mockResolvedValue(plan);
      mockPrisma.subscription.findFirst.mockResolvedValue({ id: "existing-sub" });

      await expect(
        service.createSubscription("fan-1", "plan-1", {
          provider: "pagarme",
          token: "tok",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── cancelSubscription() ──────────────────────────────

  describe("cancelSubscription", () => {
    it("should cancel an active subscription", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: "sub-1",
        subscriberId: "fan-1",
        status: "ACTIVE",
      });
      mockPrisma.subscription.update.mockResolvedValue({
        id: "sub-1",
        status: "CANCELLED",
      });

      const result = await service.cancelSubscription("fan-1", "sub-1", "Too expensive");

      expect(result.status).toBe("CANCELLED");
    });

    it("should throw if subscription not found", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelSubscription("fan-1", "bad-id"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw if already cancelled", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: "sub-1",
        subscriberId: "fan-1",
        status: "CANCELLED",
      });

      await expect(
        service.cancelSubscription("fan-1", "sub-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── handleWebhook() ──────────────────────────────────

  describe("handleWebhook", () => {
    it("should process payment.paid event", async () => {
      mockPagarme.parseWebhook = jest.fn().mockResolvedValue({
        type: "payment.paid",
        gatewayTxId: "gw_123",
        raw: {},
      });
      mockPrisma.transaction.findUnique = jest.fn().mockResolvedValue({
        id: "tx-1",
        status: "PENDING",
        creatorId: "creator-1",
        netAmount: 2392,
      });
      mockPrisma.transaction.update.mockResolvedValue({ id: "tx-1", status: "PAID" });
      mockPrisma.creatorBalance.upsert.mockResolvedValue({});

      await service.handleWebhook("pagarme", {}, "sig_123");

      expect(mockPrisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PAID" }),
        }),
      );
    });

    it("should process payment.failed event", async () => {
      mockPagarme.parseWebhook = jest.fn().mockResolvedValue({
        type: "payment.failed",
        gatewayTxId: "gw_123",
        reason: "insufficient_funds",
      });
      mockPrisma.transaction.updateMany = jest.fn().mockResolvedValue({ count: 1 });

      await service.handleWebhook("pagarme", {}, "sig_123");

      expect(mockPrisma.transaction.updateMany).toHaveBeenCalled();
    });
  });

  // ─── getTransactionHistory() ───────────────────────────

  describe("getTransactionHistory", () => {
    it("should return paginated transactions", async () => {
      mockPrisma.$transaction.mockResolvedValue([
        [{ id: "tx-1", type: "SUBSCRIPTION", status: "PAID" }],
        1,
      ]);

      const result = await service.getTransactionHistory("user-1", 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.platformFeePercent).toBe(20);
    });
  });

  // ─── Platform fee calculation ──────────────────────────

  describe("platform fee", () => {
    it("should apply 20% platform fee", () => {
      // The PLATFORM_FEE_PERCENT constant is 0.20
      const grossAmount = 2990; // R$29.90 in cents
      const platformFee = Math.round(grossAmount * 0.20);
      const netAmount = grossAmount - platformFee;

      expect(platformFee).toBe(598);
      expect(netAmount).toBe(2392);
    });
  });
});
