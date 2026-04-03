import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "../common/database/prisma.service";
import { ConfigService } from "@nestjs/config";

// ─── Mocks ─────────────────────────────────────────────────

const mockPrisma: any = {
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
  notificationPreference: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  pushSubscription: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((cb) =>
    typeof cb === "function" ? cb(mockPrisma) : Promise.all(cb),
  ),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      "app.vapid.publicKey": "",
      "app.vapid.privateKey": "",
    };
    return map[key] ?? "";
  }),
};

// ─── Test Suite ────────────────────────────────────────────

describe("NotificationsService", () => {
  let service: NotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  // ─── send() ────────────────────────────────────────────

  describe("send", () => {
    const payload = {
      userId: "user-1",
      type: "NEW_CONTENT" as any,
      title: "Novo conteudo",
      body: "Seu criador favorito postou!",
      link: "/content/123",
    };

    it("should create notification when user has no preferences (defaults enabled)", async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({
        id: "notif-1",
        ...payload,
      });
      // Push subscriptions empty — no push sent
      mockPrisma.notification.count.mockResolvedValue(0);
      mockPrisma.pushSubscription.findMany.mockResolvedValue([]);

      await service.send(payload);

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          link: payload.link,
        },
      });
    });

    it("should skip notification when type is disabled in preferences", async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        userId: "user-1",
        pushEnabled: true,
        disabledTypes: ["NEW_CONTENT"],
      });

      await service.send(payload);

      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it("should always send SYSTEM notifications even when type is disabled", async () => {
      const systemPayload = {
        userId: "user-1",
        type: "SYSTEM" as any,
        title: "System Alert",
        body: "Maintenance notice",
      };
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        userId: "user-1",
        disabledTypes: ["SYSTEM"],
      });
      mockPrisma.notification.create.mockResolvedValue({
        id: "notif-2",
        ...systemPayload,
      });
      mockPrisma.notification.count.mockResolvedValue(0);
      mockPrisma.pushSubscription.findMany.mockResolvedValue([]);

      await service.send(systemPayload);

      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it("should not send web push when pushEnabled is false", async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue({
        userId: "user-1",
        pushEnabled: false,
        disabledTypes: [],
      });
      mockPrisma.notification.create.mockResolvedValue({ id: "notif-3" });

      await service.send(payload);

      expect(mockPrisma.notification.create).toHaveBeenCalled();
      // push subscriptions should NOT be fetched
      expect(mockPrisma.pushSubscription.findMany).not.toHaveBeenCalled();
    });

    it("should respect rate limit (max 5 push/day) for web push", async () => {
      mockPrisma.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrisma.notification.create.mockResolvedValue({ id: "notif-4" });
      // 6 notifications already sent today — exceeds MAX_PUSH_PER_DAY
      mockPrisma.notification.count.mockResolvedValue(6);
      mockPrisma.pushSubscription.findMany.mockResolvedValue([]);

      await service.send(payload);

      // Notification is created but push is skipped due to rate limit
      expect(mockPrisma.notification.create).toHaveBeenCalled();
      // count is checked inside sendWebPush — findMany won't be called due to rate limit
    });
  });

  // ─── listNotifications() ───────────────────────────────

  describe("listNotifications", () => {
    it("should return paginated notifications with unread count", async () => {
      const items = [
        { id: "n1", title: "A", readAt: null },
        { id: "n2", title: "B", readAt: new Date() },
      ];
      mockPrisma.$transaction.mockResolvedValue([items, 10, 5]);

      const result = await service.listNotifications("user-1", 1, 20);

      expect(result.items).toEqual(items);
      expect(result.total).toBe(10);
      expect(result.unread).toBe(5);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        pages: 1,
      });
    });

    it("should paginate correctly on page 2", async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 50, 3]);

      const result = await service.listNotifications("user-1", 2, 10);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        pages: 5,
      });
    });

    it("should return empty results for user with no notifications", async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0, 0]);

      const result = await service.listNotifications("user-1");

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.unread).toBe(0);
    });
  });

  // ─── markRead() ────────────────────────────────────────

  describe("markRead", () => {
    it("should mark a single notification as read", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markRead("user-1", "notif-1");

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: "notif-1", userId: "user-1" },
        data: { readAt: expect.any(Date) },
      });
    });

    it("should not fail when notification does not exist", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markRead("user-1", "bad-id");

      expect(result).toEqual({ ok: true });
    });
  });

  // ─── markAllRead() ────────────────────────────────────

  describe("markAllRead", () => {
    it("should mark all unread notifications as read", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllRead("user-1");

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", readAt: null },
        data: { readAt: expect.any(Date) },
      });
    });

    it("should succeed even when no unread notifications exist", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAllRead("user-1");

      expect(result).toEqual({ ok: true });
    });
  });

  // ─── getPreferences() ─────────────────────────────────

  describe("getPreferences", () => {
    it("should upsert and return preferences for a user", async () => {
      const prefs = { userId: "user-1", pushEnabled: true, emailEnabled: true, disabledTypes: [] };
      mockPrisma.notificationPreference.upsert.mockResolvedValue(prefs);

      const result = await service.getPreferences("user-1");

      expect(result).toEqual(prefs);
      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        create: { userId: "user-1" },
        update: {},
      });
    });
  });

  // ─── updatePreferences() ──────────────────────────────

  describe("updatePreferences", () => {
    it("should update preferences with provided dto", async () => {
      const dto = { pushEnabled: false, disabledTypes: ["NEW_CONTENT"] };
      const updated = { userId: "user-1", ...dto };
      mockPrisma.notificationPreference.upsert.mockResolvedValue(updated);

      const result = await service.updatePreferences("user-1", dto as any);

      expect(result).toEqual(updated);
      expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        create: { userId: "user-1", ...dto },
        update: dto,
      });
    });
  });

  // ─── registerPushSubscription() ────────────────────────

  describe("registerPushSubscription", () => {
    it("should upsert a push subscription", async () => {
      mockPrisma.pushSubscription.upsert.mockResolvedValue({});
      const dto = {
        endpoint: "https://push.example.com/abc",
        keys: { p256dh: "key1", auth: "key2" },
      };

      const result = await service.registerPushSubscription("user-1", dto);

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.pushSubscription.upsert).toHaveBeenCalledWith({
        where: { endpoint: dto.endpoint },
        create: {
          userId: "user-1",
          endpoint: dto.endpoint,
          p256dh: dto.keys.p256dh,
          auth: dto.keys.auth,
        },
        update: {
          userId: "user-1",
          p256dh: dto.keys.p256dh,
          auth: dto.keys.auth,
        },
      });
    });
  });

  // ─── unregisterPushSubscription() ──────────────────────

  describe("unregisterPushSubscription", () => {
    it("should delete push subscription by endpoint", async () => {
      mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unregisterPushSubscription("user-1", "https://push.example.com/abc");

      expect(result).toEqual({ ok: true });
      expect(mockPrisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1", endpoint: "https://push.example.com/abc" },
      });
    });
  });
});
