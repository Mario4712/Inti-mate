import { Test, TestingModule } from "@nestjs/testing";
import { LivesService } from "./lives.service";
import { PrismaService } from "../common/database/prisma.service";
import { ConfigService } from "@nestjs/config";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

// ─── Mocks ─────────────────────────────────────────────────

const mockPrisma: any = {
  liveSession: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
  },
  superChat: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  creatorBalance: {
    upsert: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (cb) => {
    if (typeof cb === "function") return cb(mockPrisma);
    return Promise.all(cb);
  }),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      "app.livekit.host": "ws://localhost:7880",
      "app.livekit.apiKey": "",
      "app.livekit.apiSecret": "",
    };
    return map[key] ?? "";
  }),
};

// ─── Test Suite ────────────────────────────────────────────

describe("LivesService", () => {
  let service: LivesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LivesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<LivesService>(LivesService);
  });

  // ─── createLive() ──────────────────────────────────────

  describe("createLive", () => {
    const creatorId = "creator-1";
    const liveData = {
      title: "Live de sábado",
      description: "Bate-papo descontraído",
    };

    it("should create a live session successfully", async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(null); // no existing live
      mockPrisma.liveSession.create.mockResolvedValue({
        id: "live-1",
        creatorId,
        title: liveData.title,
        status: "LIVE",
        livekitRoomName: expect.any(String),
      });

      const result = await service.createLive(creatorId, liveData);

      expect(result.id).toBe("live-1");
      expect(result.hostToken).toBeDefined();
      expect(result.hostToken).toContain("mock-token");
      expect(mockPrisma.liveSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          creatorId,
          title: liveData.title,
          status: "LIVE",
          startedAt: expect.any(Date),
        }),
      });
    });

    it("should throw BadRequestException if creator already has an active live", async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue({
        id: "existing-live",
        status: "LIVE",
      });

      await expect(
        service.createLive(creatorId, liveData),
      ).rejects.toThrow(BadRequestException);
    });

    it("should create a scheduled live with SCHEDULED status", async () => {
      const futureDate = new Date(Date.now() + 86400000);
      mockPrisma.liveSession.findFirst.mockResolvedValue(null);
      mockPrisma.liveSession.create.mockResolvedValue({
        id: "live-2",
        creatorId,
        status: "SCHEDULED",
        scheduledAt: futureDate,
      });

      const result = await service.createLive(creatorId, {
        ...liveData,
        scheduledAt: futureDate,
      });

      expect(mockPrisma.liveSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: "SCHEDULED",
          scheduledAt: futureDate,
          startedAt: null,
        }),
      });
    });

    it("should set recordingConsentAt when recording is enabled", async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(null);
      mockPrisma.liveSession.create.mockResolvedValue({
        id: "live-3",
        creatorId,
        recordingEnabled: true,
      });

      await service.createLive(creatorId, {
        ...liveData,
        recordingEnabled: true,
      });

      expect(mockPrisma.liveSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recordingEnabled: true,
          recordingConsentAt: expect.any(Date),
        }),
      });
    });
  });

  // ─── getViewerToken() (join) ───────────────────────────

  describe("getViewerToken", () => {
    it("should generate viewer token for a public live", async () => {
      mockPrisma.liveSession.findUnique.mockResolvedValue({
        id: "live-1",
        creatorId: "creator-1",
        status: "LIVE",
        requiresSubscription: false,
        maxViewers: null,
        viewerCount: 0,
        livekitRoomName: "live-creator-1-123",
      });
      mockPrisma.liveSession.update.mockResolvedValue({});

      const result = await service.getViewerToken("live-1", "viewer-1");

      expect(result.token).toContain("mock-token");
      expect(result.livekitHost).toBe("ws://localhost:7880");
      expect(mockPrisma.liveSession.update).toHaveBeenCalledWith({
        where: { id: "live-1" },
        data: expect.objectContaining({
          viewerCount: { increment: 1 },
        }),
      });
    });

    it("should throw NotFoundException for non-existent live", async () => {
      mockPrisma.liveSession.findUnique.mockResolvedValue(null);

      await expect(
        service.getViewerToken("bad-id", "viewer-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException for live not in LIVE status", async () => {
      mockPrisma.liveSession.findUnique.mockResolvedValue({
        id: "live-1",
        status: "ENDED",
      });

      await expect(
        service.getViewerToken("live-1", "viewer-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when max viewers reached", async () => {
      mockPrisma.liveSession.findUnique.mockResolvedValue({
        id: "live-1",
        creatorId: "creator-1",
        status: "LIVE",
        requiresSubscription: false,
        maxViewers: 100,
        viewerCount: 100,
        livekitRoomName: "live-creator-1-123",
      });

      await expect(
        service.getViewerToken("live-1", "viewer-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException for subscriber-only live without subscription", async () => {
      mockPrisma.liveSession.findUnique.mockResolvedValue({
        id: "live-1",
        creatorId: "creator-1",
        status: "LIVE",
        requiresSubscription: true,
        maxViewers: null,
        viewerCount: 5,
        livekitRoomName: "live-creator-1-123",
      });
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      await expect(
        service.getViewerToken("live-1", "viewer-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should allow creator to join their own subscription-only live", async () => {
      mockPrisma.liveSession.findUnique.mockResolvedValue({
        id: "live-1",
        creatorId: "creator-1",
        status: "LIVE",
        requiresSubscription: true,
        maxViewers: null,
        viewerCount: 5,
        livekitRoomName: "live-creator-1-123",
      });
      mockPrisma.liveSession.update.mockResolvedValue({});

      const result = await service.getViewerToken("live-1", "creator-1");

      expect(result.token).toBeDefined();
      expect(mockPrisma.subscription.findFirst).not.toHaveBeenCalled();
    });
  });

  // ─── endLive() ─────────────────────────────────────────

  describe("endLive", () => {
    it("should end a live session", async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue({
        id: "live-1",
        creatorId: "creator-1",
        status: "LIVE",
      });
      mockPrisma.liveSession.update.mockResolvedValue({
        id: "live-1",
        status: "ENDED",
        endedAt: expect.any(Date),
      });

      const result = await service.endLive("creator-1", "live-1");

      expect(result.status).toBe("ENDED");
      expect(mockPrisma.liveSession.update).toHaveBeenCalledWith({
        where: { id: "live-1" },
        data: { status: "ENDED", endedAt: expect.any(Date) },
      });
    });

    it("should throw NotFoundException if live not found or not owned by creator", async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue(null);

      await expect(
        service.endLive("creator-1", "bad-id"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if live is already ended", async () => {
      mockPrisma.liveSession.findFirst.mockResolvedValue({
        id: "live-1",
        creatorId: "creator-1",
        status: "ENDED",
      });

      await expect(
        service.endLive("creator-1", "live-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── sendSuperChat() ──────────────────────────────────

  describe("sendSuperChat", () => {
    const liveId = "live-1";
    const senderId = "user-1";
    const liveRecord = {
      id: liveId,
      creatorId: "creator-1",
      status: "LIVE",
    };

    it("should send a super chat successfully (minimum tier)", async () => {
      mockPrisma.liveSession.findUnique.mockResolvedValue(liveRecord);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          superChat: {
            create: jest.fn().mockResolvedValue({
              id: "sc-1",
              color: "#3b82f6",
              pinnedUntil: null,
              message: "Boa live!",
            }),
          },
          creatorBalance: { upsert: jest.fn().mockResolvedValue({}) },
          transaction: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const result = await service.sendSuperChat(liveId, senderId, 2, "Boa live!");

      expect(result.id).toBe("sc-1");
      expect(result.color).toBe("#3b82f6");
      expect(result.amount).toBe(2);
    });

    it("should apply correct tier for high-value super chat (R$ 500+)", async () => {
      mockPrisma.liveSession.findUnique.mockResolvedValue(liveRecord);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          superChat: {
            create: jest.fn().mockResolvedValue({
              id: "sc-2",
              color: "#ec4899",
              pinnedUntil: expect.any(Date),
              message: "Show!",
            }),
          },
          creatorBalance: { upsert: jest.fn().mockResolvedValue({}) },
          transaction: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const result = await service.sendSuperChat(liveId, senderId, 500, "Show!");

      expect(result.color).toBe("#ec4899"); // pink tier
    });

    it("should throw BadRequestException for amount below R$ 2,00", async () => {
      await expect(
        service.sendSuperChat(liveId, senderId, 1.5, "Test"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for message exceeding 200 chars", async () => {
      const longMessage = "A".repeat(201);

      await expect(
        service.sendSuperChat(liveId, senderId, 10, longMessage),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException for non-live session", async () => {
      mockPrisma.liveSession.findUnique.mockResolvedValue({
        id: liveId,
        status: "ENDED",
      });

      await expect(
        service.sendSuperChat(liveId, senderId, 10, "Oi"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException for non-existent live", async () => {
      mockPrisma.liveSession.findUnique.mockResolvedValue(null);

      await expect(
        service.sendSuperChat("bad-id", senderId, 10, "Oi"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should calculate platform fee correctly (20%)", async () => {
      mockPrisma.liveSession.findUnique.mockResolvedValue(liveRecord);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          superChat: {
            create: jest.fn().mockImplementation(({ data }) => {
              // R$ 100.00 = 10000 cents gross, 8000 net (20% fee)
              expect(data.amount).toBe(10000);
              expect(data.netAmount).toBe(8000);
              return Promise.resolve({
                id: "sc-3",
                color: "#ef4444",
                pinnedUntil: expect.any(Date),
                message: "Fee check",
              });
            }),
          },
          creatorBalance: { upsert: jest.fn().mockResolvedValue({}) },
          transaction: {
            create: jest.fn().mockImplementation(({ data }) => {
              expect(data.grossAmount).toBe(10000);
              expect(data.platformFee).toBe(2000);
              expect(data.netAmount).toBe(8000);
              return Promise.resolve({});
            }),
          },
        };
        return cb(tx);
      });

      await service.sendSuperChat(liveId, senderId, 100, "Fee check");
    });
  });

  // ─── listUpcoming() ───────────────────────────────────

  describe("listUpcoming", () => {
    it("should return upcoming and live sessions", async () => {
      const sessions = [
        { id: "l1", status: "SCHEDULED", title: "Future Live" },
        { id: "l2", status: "LIVE", title: "Current Live" },
      ];
      mockPrisma.liveSession.findMany.mockResolvedValue(sessions);

      const result = await service.listUpcoming();

      expect(result).toEqual(sessions);
      expect(mockPrisma.liveSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ["SCHEDULED", "LIVE"] } },
        }),
      );
    });

    it("should filter by creatorId when provided", async () => {
      mockPrisma.liveSession.findMany.mockResolvedValue([]);

      await service.listUpcoming("creator-1");

      expect(mockPrisma.liveSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ creatorId: "creator-1" }),
        }),
      );
    });
  });
});
