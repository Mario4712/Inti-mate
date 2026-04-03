import { Test, TestingModule } from "@nestjs/testing";
import { MediaAccessLogService } from "./media-access-log.service";
import { PrismaService } from "../database/prisma.service";

const mockPrisma: any = {
  mediaAccessLog: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((cb: any) =>
    typeof cb === "function" ? cb(mockPrisma) : Promise.all(cb),
  ),
};

describe("MediaAccessLogService", () => {
  let service: MediaAccessLogService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaAccessLogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(MediaAccessLogService);
  });

  describe("logAccess", () => {
    it("should log media access with full session data", async () => {
      mockPrisma.mediaAccessLog.create.mockResolvedValue({ id: "log-1" });

      await service.logAccess({
        mediaId: "media-1",
        userId: "user-1",
        sessionId: "sess-1",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        accessType: "STREAM",
      });

      expect(mockPrisma.mediaAccessLog.create).toHaveBeenCalledWith({
        data: {
          mediaId: "media-1",
          userId: "user-1",
          sessionId: "sess-1",
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          accessType: "STREAM",
        },
      });
    });

    it("should handle null optional fields", async () => {
      mockPrisma.mediaAccessLog.create.mockResolvedValue({ id: "log-2" });

      await service.logAccess({ mediaId: "media-1" });

      expect(mockPrisma.mediaAccessLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mediaId: "media-1",
          userId: null,
          sessionId: null,
          ipAddress: null,
          userAgent: null,
          accessType: "VIEW",
        }),
      });
    });

    it("should not throw on database error (fire-and-forget)", async () => {
      mockPrisma.mediaAccessLog.create.mockRejectedValue(new Error("DB error"));

      // Should not throw
      await expect(
        service.logAccess({ mediaId: "media-1", userId: "user-1" }),
      ).resolves.toBeUndefined();
    });
  });

  describe("updateWatchProgress", () => {
    it("should update duration and completion status", async () => {
      mockPrisma.mediaAccessLog.update.mockResolvedValue({});

      await service.updateWatchProgress("log-1", 120, true);

      expect(mockPrisma.mediaAccessLog.update).toHaveBeenCalledWith({
        where: { id: "log-1" },
        data: {
          durationSec: 120,
          completedAt: expect.any(Date),
        },
      });
    });

    it("should set completedAt to null when not completed", async () => {
      mockPrisma.mediaAccessLog.update.mockResolvedValue({});

      await service.updateWatchProgress("log-1", 60, false);

      expect(mockPrisma.mediaAccessLog.update).toHaveBeenCalledWith({
        where: { id: "log-1" },
        data: {
          durationSec: 60,
          completedAt: null,
        },
      });
    });
  });

  describe("getAccessHistory", () => {
    it("should return paginated access history for a media", async () => {
      const items = [{ id: "log-1", userId: "user-1", createdAt: new Date() }];
      mockPrisma.$transaction.mockResolvedValue([items, 1]);

      const result = await service.getAccessHistory("media-1", 1, 50);

      expect(result.items).toEqual(items);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 1,
        pages: 1,
      });
    });
  });

  describe("getUserAccessHistory", () => {
    it("should return paginated access history for a user", async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      const result = await service.getUserAccessHistory("user-1");

      expect(result.pagination.total).toBe(0);
    });
  });

  describe("getAccessesByIp", () => {
    it("should return accesses for an IP address", async () => {
      const items = [{ id: "log-1", mediaId: "m-1", userId: "u-1" }];
      mockPrisma.$transaction.mockResolvedValue([items, 1]);

      const result = await service.getAccessesByIp("192.168.1.1");

      expect(result.items).toHaveLength(1);
      expect(result.items[0].mediaId).toBe("m-1");
    });
  });
});
