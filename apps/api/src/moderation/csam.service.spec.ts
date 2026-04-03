import { Test, TestingModule } from "@nestjs/testing";
import { CsamService } from "./csam.service";
import { PrismaService } from "../common/database/prisma.service";
import { ConfigService } from "@nestjs/config";

// ─── Mocks ─────────────────────────────────────────────────

const mockPrisma: any = {
  moderationLog: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      "app.csam.provider": "local",
    };
    return map[key] ?? undefined;
  }),
};

// ─── Test Suite ────────────────────────────────────────────

describe("CsamService", () => {
  let service: CsamService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsamService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<CsamService>(CsamService);
  });

  // ─── scan() ────────────────────────────────────────────

  describe("scan", () => {
    it("should return clean result for unknown hash (local provider)", async () => {
      mockPrisma.moderationLog.findFirst.mockResolvedValue(null);

      const result = await service.scan(Buffer.from("safe-image"), "image/jpeg");

      expect(result.isFlagged).toBe(false);
      expect(result.isCsam).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.provider).toBe("local");
      expect(result.hash).toBeDefined();
    });

    it("should flag content when hash matches a known CSAM hash", async () => {
      mockPrisma.moderationLog.findFirst.mockResolvedValue({
        id: "log-1",
        csamHash: "abc123",
        action: "CSAM_REPORTED",
      });

      const result = await service.scan(Buffer.from("bad-content"), "image/jpeg");

      expect(result.isFlagged).toBe(true);
      expect(result.isCsam).toBe(true);
      expect(result.confidence).toBe(1);
      expect(result.provider).toBe("local");
    });

    it("should compute consistent SHA-256 hash for same content", async () => {
      mockPrisma.moderationLog.findFirst.mockResolvedValue(null);

      const buffer = Buffer.from("deterministic-content");
      const result1 = await service.scan(buffer, "image/jpeg");
      const result2 = await service.scan(buffer, "image/png");

      expect(result1.hash).toBe(result2.hash);
      expect(result1.hash).toHaveLength(64); // SHA-256 hex
    });
  });

  // ─── reportDetection() ─────────────────────────────────

  describe("reportDetection", () => {
    it("should create moderation log and notify authorities", async () => {
      const log = {
        id: "log-1",
        contentId: "content-1",
        contentType: "image/jpeg",
        action: "CSAM_REPORTED",
        csamHash: "abc123",
        reportedToAuthority: false,
      };
      mockPrisma.moderationLog.create.mockResolvedValue(log);
      mockPrisma.moderationLog.update.mockResolvedValue({
        ...log,
        reportedToAuthority: true,
      });

      const result = await service.reportDetection(
        "content-1",
        "image/jpeg",
        "abc123",
      );

      expect(result.id).toBe("log-1");
      expect(mockPrisma.moderationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contentId: "content-1",
          contentType: "image/jpeg",
          action: "CSAM_REPORTED",
          csamHash: "abc123",
          reportedToAuthority: false,
          reason: "Detecção automática de CSAM",
        }),
      });
    });

    it("should include moderatorId when provided", async () => {
      mockPrisma.moderationLog.create.mockResolvedValue({ id: "log-2" });
      mockPrisma.moderationLog.update.mockResolvedValue({});

      await service.reportDetection(
        "content-2",
        "image/png",
        "def456",
        "mod-1",
      );

      expect(mockPrisma.moderationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          moderatorId: "mod-1",
        }),
      });
    });

    it("should update log with reportReference after notifying authorities", async () => {
      mockPrisma.moderationLog.create.mockResolvedValue({ id: "log-3" });
      mockPrisma.moderationLog.update.mockResolvedValue({});

      await service.reportDetection("content-3", "video/mp4", "ghi789");

      expect(mockPrisma.moderationLog.update).toHaveBeenCalledWith({
        where: { id: "log-3" },
        data: {
          reportedToAuthority: true,
          reportReference: expect.stringContaining("PENDING-log-3"),
        },
      });
    });
  });
});
