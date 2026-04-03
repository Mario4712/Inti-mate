import { Test, TestingModule } from "@nestjs/testing";
import { ContentService } from "./content.service";
import { PrismaService } from "../common/database/prisma.service";
import { StorageService } from "./storage.service";
import { MediaProcessorService } from "./media-processor.service";
import { ModerationService } from "../moderation/moderation.service";
import { MediaAccessLogService } from "../common/access-log/media-access-log.service";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

// ─── Mocks ─────────────────────────────────────────────────

const mockPrisma: any = {
  media: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn((cb) =>
    typeof cb === "function" ? cb(mockPrisma) : Promise.all(cb),
  ),
};

const mockStorage = {
  uploadMedia: jest.fn().mockResolvedValue({ url: "https://cdn.test/media/file.jpg" }),
  getSignedUrl: jest.fn().mockResolvedValue("https://cdn.test/signed/file.mp4?token=abc"),
  publicUrl: jest.fn().mockReturnValue("https://cdn.test"),
  deleteMedia: jest.fn().mockResolvedValue(undefined),
};

const mockProcessor = {
  processImage: jest.fn().mockResolvedValue({
    optimized: Buffer.from("opt"),
    thumbnail: Buffer.from("thumb"),
    width: 1920,
    height: 1080,
  }),
  processVideo: jest.fn().mockResolvedValue({
    hlsDir: "/tmp/hls-123",
    thumbnailBuf: Buffer.from("thumb"),
    durationSec: 120,
  }),
  cleanupTmpDir: jest.fn().mockResolvedValue(undefined),
};

const mockModeration = {
  processUpload: jest.fn().mockResolvedValue({ approved: true, requiresReview: false }),
};

const mockAccessLog = {
  logAccess: jest.fn().mockResolvedValue(undefined),
  updateWatchProgress: jest.fn().mockResolvedValue(undefined),
};

// ─── Test Suite ────────────────────────────────────────────

describe("ContentService", () => {
  let service: ContentService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorage },
        { provide: MediaProcessorService, useValue: mockProcessor },
        { provide: ModerationService, useValue: mockModeration },
        { provide: MediaAccessLogService, useValue: mockAccessLog },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
  });

  // ─── uploadMedia() ─────────────────────────────────────

  describe("uploadMedia", () => {
    const creatorId = "creator-1";
    const imageBuffer = Buffer.from("fake-image-data");
    const videoBuffer = Buffer.from("fake-video-data");

    it("should upload a valid image successfully", async () => {
      mockModeration.processUpload.mockResolvedValue({ approved: true, requiresReview: false });
      mockPrisma.media.create.mockResolvedValue({
        id: "media-1",
        creatorId,
        type: "PHOTO",
        status: "APPROVED",
      });

      const result = await service.uploadMedia(creatorId, imageBuffer, "image/jpeg");

      expect(result.id).toBe("media-1");
      expect(result.type).toBe("PHOTO");
      expect(result.status).toBe("APPROVED");
      expect(result.message).toContain("aprovado");
      expect(mockModeration.processUpload).toHaveBeenCalledWith(
        imageBuffer,
        "image/jpeg",
        "photo",
        creatorId,
        expect.any(String),
      );
    });

    it("should upload a valid video successfully", async () => {
      mockModeration.processUpload.mockResolvedValue({ approved: true, requiresReview: false });
      mockPrisma.media.create.mockResolvedValue({
        id: "media-2",
        creatorId,
        type: "VIDEO",
        status: "APPROVED",
      });

      const result = await service.uploadMedia(creatorId, videoBuffer, "video/mp4");

      expect(result.id).toBe("media-2");
      expect(result.type).toBe("VIDEO");
      expect(mockModeration.processUpload).toHaveBeenCalledWith(
        videoBuffer,
        "video/mp4",
        "video",
        creatorId,
        expect.any(String),
      );
    });

    it("should throw BadRequestException for invalid mime type", async () => {
      await expect(
        service.uploadMedia(creatorId, imageBuffer, "application/pdf"),
      ).rejects.toThrow(BadRequestException);

      expect(mockModeration.processUpload).not.toHaveBeenCalled();
      expect(mockPrisma.media.create).not.toHaveBeenCalled();
    });

    it("should set status to PENDING_REVIEW when moderation flags content", async () => {
      mockModeration.processUpload.mockResolvedValue({ approved: false, requiresReview: true });
      mockPrisma.media.create.mockResolvedValue({
        id: "media-3",
        creatorId,
        type: "PHOTO",
        status: "PENDING_REVIEW",
      });

      const result = await service.uploadMedia(creatorId, imageBuffer, "image/png");

      expect(result.status).toBe("PENDING_REVIEW");
      expect(result.message).toContain("revisão");
      expect(mockPrisma.media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PENDING_REVIEW" }),
        }),
      );
    });

    it("should accept image/webp as a valid image type", async () => {
      mockModeration.processUpload.mockResolvedValue({ approved: true, requiresReview: false });
      mockPrisma.media.create.mockResolvedValue({
        id: "media-4",
        creatorId,
        type: "PHOTO",
        status: "APPROVED",
      });

      const result = await service.uploadMedia(creatorId, imageBuffer, "image/webp");

      expect(result.type).toBe("PHOTO");
    });

    it("should accept video/webm as a valid video type", async () => {
      mockModeration.processUpload.mockResolvedValue({ approved: true, requiresReview: false });
      mockPrisma.media.create.mockResolvedValue({
        id: "media-5",
        creatorId,
        type: "VIDEO",
        status: "APPROVED",
      });

      const result = await service.uploadMedia(creatorId, videoBuffer, "video/webm");

      expect(result.type).toBe("VIDEO");
    });
  });

  // ─── getCreatorGallery() ───────────────────────────────

  describe("getCreatorGallery", () => {
    const creatorId = "creator-1";

    it("should return only PUBLIC items for unauthenticated viewer", async () => {
      const items = [{ id: "m1", visibility: "PUBLIC" }];
      mockPrisma.$transaction.mockResolvedValue([items, 1]);

      const result = await service.getCreatorGallery(creatorId, null, 1, 20);

      expect(result.hasAccess).toBe(false);
      expect(result.items).toEqual(items);
      expect(result.pagination.total).toBe(1);
    });

    it("should return all items for a subscriber with active subscription", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ id: "sub-1" });
      const items = [
        { id: "m1", visibility: "PUBLIC" },
        { id: "m2", visibility: "SUBSCRIBERS" },
      ];
      mockPrisma.$transaction.mockResolvedValue([items, 2]);

      const result = await service.getCreatorGallery(creatorId, "viewer-1", 1, 20);

      expect(result.hasAccess).toBe(true);
      expect(result.items).toHaveLength(2);
    });

    it("should return only PUBLIC items for viewer without subscription", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      const items = [{ id: "m1", visibility: "PUBLIC" }];
      mockPrisma.$transaction.mockResolvedValue([items, 1]);

      const result = await service.getCreatorGallery(creatorId, "viewer-2", 1, 20);

      expect(result.hasAccess).toBe(false);
    });

    it("should paginate results correctly", async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 50]);

      const result = await service.getCreatorGallery(creatorId, null, 3, 10);

      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 50,
        pages: 5,
      });
    });
  });

  // ─── getMediaItem() ────────────────────────────────────

  describe("getMediaItem", () => {
    const viewerId = "viewer-1";

    it("should return media and increment view count for public content", async () => {
      mockPrisma.media.findUnique.mockResolvedValue({
        id: "media-1",
        creatorId: "creator-1",
        visibility: "PUBLIC",
        status: "APPROVED",
        type: "PHOTO",
        processedUrl: "https://cdn.test/photo.jpg",
      });
      mockPrisma.media.update.mockResolvedValue({});

      const result = await service.getMediaItem("media-1", viewerId);

      expect(result.id).toBe("media-1");
      expect(mockPrisma.media.update).toHaveBeenCalledWith({
        where: { id: "media-1" },
        data: { viewCount: { increment: 1 } },
      });
    });

    it("should throw NotFoundException for non-existent media", async () => {
      mockPrisma.media.findUnique.mockResolvedValue(null);

      await expect(service.getMediaItem("bad-id", viewerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException for non-approved media", async () => {
      mockPrisma.media.findUnique.mockResolvedValue({
        id: "media-1",
        status: "PENDING_REVIEW",
      });

      await expect(service.getMediaItem("media-1", viewerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException for subscribers-only content without subscription", async () => {
      mockPrisma.media.findUnique.mockResolvedValue({
        id: "media-1",
        creatorId: "creator-1",
        visibility: "SUBSCRIBERS",
        status: "APPROVED",
        type: "PHOTO",
        processedUrl: "https://cdn.test/photo.jpg",
      });
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      await expect(service.getMediaItem("media-1", viewerId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should allow creator to view their own subscriber-only content", async () => {
      const creatorId = "creator-1";
      mockPrisma.media.findUnique.mockResolvedValue({
        id: "media-1",
        creatorId,
        visibility: "SUBSCRIBERS",
        status: "APPROVED",
        type: "PHOTO",
        processedUrl: "https://cdn.test/photo.jpg",
      });
      mockPrisma.media.update.mockResolvedValue({});

      const result = await service.getMediaItem("media-1", creatorId);

      expect(result.id).toBe("media-1");
    });

    it("should generate signed URL for video content", async () => {
      mockPrisma.media.findUnique.mockResolvedValue({
        id: "media-1",
        creatorId: "creator-1",
        visibility: "PUBLIC",
        status: "APPROVED",
        type: "VIDEO",
        processedUrl: "https://cdn.test/hls/master.m3u8",
      });
      mockPrisma.media.update.mockResolvedValue({});
      mockStorage.publicUrl.mockReturnValue("https://cdn.test");
      mockStorage.getSignedUrl.mockResolvedValue("https://cdn.test/signed/master.m3u8?token=xyz");

      const result = await service.getMediaItem("media-1", "viewer-1");

      expect(mockStorage.getSignedUrl).toHaveBeenCalledWith(
        expect.any(String),
        7200,
      );
      expect(result.processedUrl).toContain("signed");
    });
  });

  // ─── updateMedia() ─────────────────────────────────────

  describe("updateMedia", () => {
    it("should update media title and visibility", async () => {
      mockPrisma.media.findFirst.mockResolvedValue({ id: "media-1", creatorId: "creator-1" });
      mockPrisma.media.update.mockResolvedValue({
        id: "media-1",
        title: "New Title",
        visibility: "PUBLIC",
      });

      const result = await service.updateMedia("creator-1", "media-1", {
        title: "New Title",
        visibility: "PUBLIC" as any,
      });

      expect(result.title).toBe("New Title");
      expect(mockPrisma.media.update).toHaveBeenCalledWith({
        where: { id: "media-1" },
        data: { title: "New Title", visibility: "PUBLIC" },
      });
    });

    it("should throw NotFoundException if media does not belong to creator", async () => {
      mockPrisma.media.findFirst.mockResolvedValue(null);

      await expect(
        service.updateMedia("creator-1", "bad-id", { title: "X" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteMedia() ─────────────────────────────────────

  describe("deleteMedia", () => {
    it("should delete media and remove from storage", async () => {
      mockPrisma.media.findFirst.mockResolvedValue({
        id: "media-1",
        creatorId: "creator-1",
        processedUrl: "https://cdn.test/creators/creator-1/photos/file.jpg",
      });
      mockPrisma.media.delete.mockResolvedValue({});

      const result = await service.deleteMedia("creator-1", "media-1");

      expect(result.deleted).toBe(true);
      expect(mockStorage.deleteMedia).toHaveBeenCalled();
      expect(mockPrisma.media.delete).toHaveBeenCalledWith({ where: { id: "media-1" } });
    });

    it("should throw NotFoundException if media not owned by creator", async () => {
      mockPrisma.media.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteMedia("creator-1", "bad-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
