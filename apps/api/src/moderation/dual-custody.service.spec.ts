import { Test, TestingModule } from "@nestjs/testing";
import { DualCustodyService } from "./dual-custody.service";
import { PrismaService } from "../common/database/prisma.service";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

const mockPrisma: any = {
  contentCustodyReview: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  media: {
    update: jest.fn(),
  },
  moderationLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn((cb: any) =>
    typeof cb === "function" ? cb(mockPrisma) : Promise.all(cb),
  ),
};

describe("DualCustodyService", () => {
  let service: DualCustodyService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DualCustodyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(DualCustodyService);
  });

  describe("createReview", () => {
    it("should create a custody review for new media", async () => {
      mockPrisma.contentCustodyReview.findUnique.mockResolvedValue(null);
      mockPrisma.contentCustodyReview.create.mockResolvedValue({ id: "rev-1" });

      await service.createReview("media-1");

      expect(mockPrisma.contentCustodyReview.create).toHaveBeenCalledWith({
        data: { mediaId: "media-1" },
      });
    });

    it("should skip if review already exists", async () => {
      mockPrisma.contentCustodyReview.findUnique.mockResolvedValue({ id: "rev-1" });

      await service.createReview("media-1");

      expect(mockPrisma.contentCustodyReview.create).not.toHaveBeenCalled();
    });
  });

  describe("submitDecision", () => {
    const baseReview = {
      id: "rev-1",
      mediaId: "media-1",
      reviewer1Id: null,
      decision1: null,
      reason1: null,
      reviewer2Id: null,
      decision2: null,
      reason2: null,
      finalDecision: null,
    };

    it("should register first reviewer decision", async () => {
      mockPrisma.contentCustodyReview.findUnique.mockResolvedValue(baseReview);
      mockPrisma.contentCustodyReview.update.mockResolvedValue({});

      const result = await service.submitDecision("rev-1", "mod-1", "APPROVE", "Conteúdo ok");

      expect(result.status).toBe("AWAITING_SECOND_REVIEW");
      expect(mockPrisma.contentCustodyReview.update).toHaveBeenCalledWith({
        where: { id: "rev-1" },
        data: expect.objectContaining({
          reviewer1Id: "mod-1",
          decision1: "APPROVE",
          reason1: "Conteúdo ok",
        }),
      });
    });

    it("should resolve with APPROVE when both reviewers approve", async () => {
      // First review already done
      const reviewWithFirst = {
        ...baseReview,
        reviewer1Id: "mod-1",
        decision1: "APPROVE",
        reason1: "ok",
        reviewedAt1: new Date(),
      };
      mockPrisma.contentCustodyReview.findUnique
        .mockResolvedValueOnce(reviewWithFirst) // for submitDecision lookup
        .mockResolvedValueOnce({                // for resolveReview lookup
          ...reviewWithFirst,
          reviewer2Id: "mod-2",
          decision2: "APPROVE",
        });
      mockPrisma.contentCustodyReview.update.mockResolvedValue({});
      mockPrisma.media.update.mockResolvedValue({});
      mockPrisma.moderationLog.create.mockResolvedValue({});

      const result: any = await service.submitDecision("rev-1", "mod-2", "APPROVE");

      expect(result.status).toBe("RESOLVED");
      expect(result.finalDecision).toBe("APPROVE");
      expect(result.contentStatus).toBe("APPROVED");
    });

    it("should resolve with REJECT when both reviewers reject", async () => {
      const reviewWithFirst = {
        ...baseReview,
        reviewer1Id: "mod-1",
        decision1: "REJECT",
        reason1: "Conteúdo proibido",
        reviewedAt1: new Date(),
      };
      mockPrisma.contentCustodyReview.findUnique
        .mockResolvedValueOnce(reviewWithFirst)
        .mockResolvedValueOnce({
          ...reviewWithFirst,
          reviewer2Id: "mod-2",
          decision2: "REJECT",
        });
      mockPrisma.contentCustodyReview.update.mockResolvedValue({});
      mockPrisma.media.update.mockResolvedValue({});
      mockPrisma.moderationLog.create.mockResolvedValue({});

      const result: any = await service.submitDecision("rev-1", "mod-2", "REJECT", "Concordo");

      expect(result.status).toBe("RESOLVED");
      expect(result.finalDecision).toBe("REJECT");
      expect(result.contentStatus).toBe("REJECTED");
    });

    it("should ESCALATE when reviewers diverge", async () => {
      const reviewWithFirst = {
        ...baseReview,
        reviewer1Id: "mod-1",
        decision1: "APPROVE",
        reason1: "ok",
        reviewedAt1: new Date(),
      };
      mockPrisma.contentCustodyReview.findUnique
        .mockResolvedValueOnce(reviewWithFirst)
        .mockResolvedValueOnce({
          ...reviewWithFirst,
          reviewer2Id: "mod-2",
          decision2: "REJECT",
        });
      mockPrisma.contentCustodyReview.update.mockResolvedValue({});
      mockPrisma.media.update.mockResolvedValue({});
      mockPrisma.moderationLog.create.mockResolvedValue({});

      const result: any = await service.submitDecision("rev-1", "mod-2", "REJECT", "Suspeito");

      expect(result.status).toBe("RESOLVED");
      expect(result.finalDecision).toBe("ESCALATE");
      expect(result.conflictNote).toContain("Divergência");
      expect(result.contentStatus).toBe("FLAGGED");
    });

    it("should prevent same moderator from reviewing twice", async () => {
      const reviewWithFirst = {
        ...baseReview,
        reviewer1Id: "mod-1",
        decision1: "APPROVE",
      };
      mockPrisma.contentCustodyReview.findUnique.mockResolvedValue(reviewWithFirst);

      await expect(
        service.submitDecision("rev-1", "mod-1", "APPROVE"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException for missing review", async () => {
      mockPrisma.contentCustodyReview.findUnique.mockResolvedValue(null);

      await expect(
        service.submitDecision("bad-id", "mod-1", "APPROVE"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for already finalized review", async () => {
      mockPrisma.contentCustodyReview.findUnique.mockResolvedValue({
        ...baseReview,
        finalDecision: "APPROVE",
      });

      await expect(
        service.submitDecision("rev-1", "mod-1", "APPROVE"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("adminResolve", () => {
    it("should allow admin to resolve escalated review", async () => {
      mockPrisma.contentCustodyReview.findUnique.mockResolvedValue({
        id: "rev-1",
        mediaId: "media-1",
        finalDecision: "ESCALATE",
        conflictNote: "Divergência",
      });
      mockPrisma.$transaction.mockResolvedValue([{}, {}, {}]);

      const result = await service.adminResolve("rev-1", "admin-1", "APPROVE", "Conteúdo aceitável");

      expect(result.status).toBe("RESOLVED_BY_ADMIN");
      expect(result.finalDecision).toBe("APPROVE");
    });

    it("should throw NotFoundException for missing review", async () => {
      mockPrisma.contentCustodyReview.findUnique.mockResolvedValue(null);

      await expect(
        service.adminResolve("bad", "admin-1", "REJECT", "x"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getStats", () => {
    it("should return custody stats", async () => {
      mockPrisma.$transaction.mockResolvedValue([5, 20, 2]);

      const result = await service.getStats();

      expect(result).toEqual({ pending: 5, resolved: 20, escalated: 2 });
    });
  });
});
