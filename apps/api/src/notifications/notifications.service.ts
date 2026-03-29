import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../common/database/prisma.service";
import { UpdatePreferencesDto, RegisterPushDto } from "./dto/notifications.dto";

// Web Push via web-push library (instalado separadamente)
// import * as webPush from "web-push";

const MAX_PUSH_PER_DAY = 5;

export type NotificationType =
  | "NEW_CONTENT"
  | "NEW_MESSAGE"
  | "NEW_SUBSCRIBER"
  | "PAYMENT_RECEIVED"
  | "SYSTEM";

export interface NotificationPayload {
  userId:  string;
  type:    NotificationType;
  title:   string;
  body:    string;
  url?:    string;
  data?:   Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly vapidPublicKey:  string;
  private readonly vapidPrivateKey: string;

  constructor(
    private prisma:  PrismaService,
    private config:  ConfigService,
  ) {
    this.vapidPublicKey  = config.get("app.vapid.publicKey")  ?? "";
    this.vapidPrivateKey = config.get("app.vapid.privateKey") ?? "";
  }

  // ─── Envio ────────────────────────────────────────────────

  async send(payload: NotificationPayload): Promise<void> {
    const { userId, type, title, body, url, data } = payload;

    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!this.isTypeEnabled(type, prefs)) {
      this.logger.debug(`Notificação ${type} desativada para ${userId}`);
      return;
    }

    // Persistir notificação no banco
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, body, url: url ?? null, data: data ?? {} },
    });

    // Web Push (se habilitado nas preferências)
    if (!prefs || prefs.pushEnabled !== false) {
      await this.sendWebPush(userId, { title, body, url }, notification.id);
    }
  }

  // ─── Listar ───────────────────────────────────────────────

  async listNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total, unread] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where:   { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return { items, total, unread, pagination: { page, limit, pages: Math.ceil(total / limit) } };
  }

  async markRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data:  { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data:  { readAt: new Date() },
    });
    return { ok: true };
  }

  // ─── Preferências ─────────────────────────────────────────

  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.upsert({
      where:  { userId },
      create: { userId },
      update: {},
    });
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    return this.prisma.notificationPreference.upsert({
      where:  { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }

  // ─── Web Push subscription ────────────────────────────────

  async registerPushSubscription(userId: string, dto: RegisterPushDto) {
    await this.prisma.pushSubscription.upsert({
      where:  { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh:   dto.keys.p256dh,
        auth:     dto.keys.auth,
      },
      update: {
        userId,
        p256dh: dto.keys.p256dh,
        auth:   dto.keys.auth,
      },
    });
    return { ok: true };
  }

  async unregisterPushSubscription(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    return { ok: true };
  }

  // ─── Helpers privados ─────────────────────────────────────

  private isTypeEnabled(type: NotificationType, prefs: any): boolean {
    if (!prefs) return true; // defaults todos habilitados

    const map: Record<NotificationType, string> = {
      NEW_CONTENT:      "newContent",
      NEW_MESSAGE:      "newMessage",
      NEW_SUBSCRIBER:   "newSubscriber",
      PAYMENT_RECEIVED: "paymentReceived",
      SYSTEM:           "pushEnabled",
    };

    const field = map[type];
    return field ? prefs[field] !== false : true;
  }

  private async sendWebPush(
    userId:         string,
    payload:        { title: string; body: string; url?: string },
    notificationId: string,
  ) {
    // Rate limit: max 5 push por dia por usuário
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await this.prisma.notification.count({
      where: {
        userId,
        createdAt: { gte: today },
        type:      { not: "SYSTEM" },
      },
    });

    if (todayCount > MAX_PUSH_PER_DAY) {
      this.logger.debug(`Rate limit push atingido para ${userId}`);
      return;
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    for (const sub of subscriptions) {
      try {
        // TODO: descomentar quando web-push for instalado
        // await webPush.sendNotification(
        //   { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        //   JSON.stringify({ title: payload.title, body: payload.body, url: payload.url, id: notificationId }),
        //   { vapidDetails: { subject: "mailto:support@inti.mate", publicKey: this.vapidPublicKey, privateKey: this.vapidPrivateKey } },
        // );
        this.logger.debug(`Web push enviado para endpoint ${sub.endpoint.slice(0, 30)}...`);
      } catch (err: any) {
        if (err.statusCode === 410) {
          // Subscription expirada — remover
          await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          this.logger.error(`Erro ao enviar web push:`, err);
        }
      }
    }
  }
}
