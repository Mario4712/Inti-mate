import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../common/database/prisma.service";

import { AccessToken } from "livekit-server-sdk";

const PLATFORM_FEE = 0.20;

// Mapa de cor por valor do super chat
const SUPERCHAT_COLORS: Array<{ minBRL: number; color: string; pinnedSec: number }> = [
  { minBRL: 2,   color: "#3b82f6", pinnedSec: 0   }, // azul
  { minBRL: 10,  color: "#8b5cf6", pinnedSec: 30  }, // roxo
  { minBRL: 50,  color: "#f59e0b", pinnedSec: 120 }, // amarelo
  { minBRL: 100, color: "#ef4444", pinnedSec: 300 }, // vermelho
  { minBRL: 500, color: "#ec4899", pinnedSec: 600 }, // rosa
];

function getSuperChatMeta(amountBRL: number) {
  const tier = [...SUPERCHAT_COLORS].reverse().find((t) => amountBRL >= t.minBRL)
    ?? SUPERCHAT_COLORS[0];
  return tier;
}

@Injectable()
export class LivesService {
  private readonly logger = new Logger(LivesService.name);
  private readonly livekitHost: string;
  private readonly livekitApiKey: string;
  private readonly livekitApiSecret: string;

  constructor(
    private prisma:  PrismaService,
    private config:  ConfigService,
  ) {
    this.livekitHost      = config.get("app.livekit.host")      ?? "ws://localhost:7880";
    this.livekitApiKey    = config.get("app.livekit.apiKey")    ?? "";
    this.livekitApiSecret = config.get("app.livekit.apiSecret") ?? "";

    if (!this.livekitApiKey || !this.livekitApiSecret) {
      this.logger.warn("LIVEKIT_API_KEY / LIVEKIT_API_SECRET não configurados — lives usarão tokens mock");
    }
  }

  // ─── Criar live ───────────────────────────────────────────

  async createLive(
    creatorId: string,
    data: {
      title: string;
      description?: string;
      scheduledAt?: Date;
      requiresSubscription?: boolean;
      maxViewers?: number;
      recordingEnabled?: boolean;
    },
  ) {
    // Só 1 live ativa por criador ao mesmo tempo
    const existing = await this.prisma.liveSession.findFirst({
      where: { creatorId, status: { in: ["SCHEDULED", "LIVE"] } },
    });
    if (existing) throw new BadRequestException("Você já tem uma live ativa ou agendada");

    // Se gravação habilitada, registra consentimento explícito agora
    const recordingConsentAt = data.recordingEnabled ? new Date() : null;

    const roomName = `live-${creatorId}-${Date.now()}`;

    const live = await this.prisma.liveSession.create({
      data: {
        creatorId,
        title:                data.title,
        description:          data.description          ?? null,
        scheduledAt:          data.scheduledAt          ?? null,
        requiresSubscription: data.requiresSubscription ?? true,
        maxViewers:           data.maxViewers            ?? null,
        recordingEnabled:     data.recordingEnabled      ?? false,
        recordingConsentAt,
        livekitRoomName: roomName,
        status: data.scheduledAt ? "SCHEDULED" : "LIVE",
        startedAt: data.scheduledAt ? null : new Date(),
      },
    });

    const hostToken = await this.generateToken(roomName, creatorId, "publisher");

    return { ...live, hostToken };
  }

  // ─── Token de espectador ──────────────────────────────────

  async getViewerToken(liveId: string, viewerId: string) {
    const live = await this.prisma.liveSession.findUnique({ where: { id: liveId } });
    if (!live || live.status !== "LIVE") throw new NotFoundException("Live não encontrada ou não está ao vivo");

    if (live.maxViewers && live.viewerCount >= live.maxViewers) {
      throw new ForbiddenException("Capacidade máxima de espectadores atingida");
    }

    if (live.requiresSubscription && live.creatorId !== viewerId) {
      const sub = await this.prisma.subscription.findFirst({
        where: {
          subscriberId: viewerId,
          creatorId:    live.creatorId,
          status:       { in: ["ACTIVE", "PAST_DUE"] },
          currentPeriodEnd: { gte: new Date() },
        },
      });
      if (!sub) throw new ForbiddenException("Assinatura necessária para assistir esta live");
    }

    // Incrementa contador de espectadores
    await this.prisma.liveSession.update({
      where: { id: liveId },
      data:  {
        viewerCount: { increment: 1 },
        peakViewers: { increment: 0 }, // será atualizado via event do LiveKit webhook
      },
    });

    const token = await this.generateToken(live.livekitRoomName!, viewerId, "subscriber");
    return { token, livekitHost: this.livekitHost };
  }

  // ─── Encerrar live ────────────────────────────────────────

  async endLive(creatorId: string, liveId: string) {
    const live = await this.prisma.liveSession.findFirst({
      where: { id: liveId, creatorId },
    });
    if (!live) throw new NotFoundException();
    if (live.status === "ENDED") throw new BadRequestException("Live já encerrada");

    return this.prisma.liveSession.update({
      where: { id: liveId },
      data:  { status: "ENDED", endedAt: new Date() },
    });
  }

  async listUpcoming(creatorId?: string) {
    // Auto-end lives that have been running for more than 8 hours (stale)
    await this.prisma.liveSession.updateMany({
      where: {
        status: "LIVE",
        startedAt: { lt: new Date(Date.now() - 8 * 60 * 60 * 1000) },
      },
      data: { status: "ENDED", endedAt: new Date() },
    });

    const where: any = { status: { in: ["SCHEDULED", "LIVE", "ENDED"] } };
    if (creatorId) where.creatorId = creatorId;

    const sessions = await this.prisma.liveSession.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      take: 50,
      select: {
        id: true, creatorId: true, title: true, description: true,
        status: true, scheduledAt: true, startedAt: true,
        viewerCount: true, requiresSubscription: true,
        creator: {
          select: {
            id: true,
            username: true,
            profile: { select: { artisticName: true, avatarUrl: true } },
          },
        },
      },
    });

    return sessions.map((s) => ({
      ...s,
      creator: s.creator ? {
        id: s.creator.id,
        username: s.creator.username,
        artisticName: s.creator.profile?.artisticName ?? s.creator.username,
        avatarUrl: s.creator.profile?.avatarUrl ?? null,
      } : null,
    }));
  }

  // ─── Item 31: Super Chat ──────────────────────────────────

  async sendSuperChat(
    liveId:   string,
    senderId: string,
    amountBRL: number,
    message:  string,
  ) {
    if (amountBRL < 2) throw new BadRequestException("Valor mínimo para Super Chat é R$ 2,00");
    if (message.length > 200) throw new BadRequestException("Mensagem deve ter no máximo 200 caracteres");

    const live = await this.prisma.liveSession.findUnique({ where: { id: liveId } });
    if (!live || live.status !== "LIVE") throw new NotFoundException("Live não está ao vivo");

    const meta = getSuperChatMeta(amountBRL);
    const grossCents = Math.round(amountBRL * 100);
    const netCents   = Math.round(grossCents * (1 - PLATFORM_FEE));
    const pinnedUntil = meta.pinnedSec > 0
      ? new Date(Date.now() + meta.pinnedSec * 1000)
      : null;

    const superChat = await this.prisma.$transaction(async (tx) => {
      const sc = await tx.superChat.create({
        data: {
          liveId,
          senderId,
          amount:      grossCents,
          netAmount:   netCents,
          message,
          color:       meta.color,
          pinnedUntil,
        },
      });

      // Crédita criador
      await tx.creatorBalance.upsert({
        where:  { creatorId: live.creatorId },
        create: { creatorId: live.creatorId, availableAmount: netCents, pendingAmount: 0, totalEarned: netCents },
        update: { availableAmount: { increment: netCents }, totalEarned: { increment: netCents } },
      });

      // Registra transação
      await tx.transaction.create({
        data: {
          userId:      senderId,
          creatorId:   live.creatorId,
          type:        "SUPERCHAT",
          status:      "PAID",
          grossAmount: grossCents,
          platformFee: grossCents - netCents,
          netAmount:   netCents,
          description: `Super Chat: ${message.slice(0, 50)}`,
        },
      });

      return sc;
    });

    return {
      id:          superChat.id,
      color:       superChat.color,
      pinnedUntil: superChat.pinnedUntil,
      message:     superChat.message,
      amount:      amountBRL,
    };
  }

  async getLiveSuperChats(liveId: string) {
    const chats = await this.prisma.superChat.findMany({
      where:   { liveId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, senderId: true, message: true,
        amount: true, color: true, pinnedUntil: true, createdAt: true,
      },
    });
    // `amount` is stored in cents — convert to BRL for the frontend
    return chats.map((c) => ({ ...c, amount: c.amount / 100 }));
  }

  // ─── LiveKit token (stub) ─────────────────────────────────

  private async generateToken(
    roomName: string,
    identity: string,
    role:     "publisher" | "subscriber",
  ): Promise<string> {
    if (!this.livekitApiKey || !this.livekitApiSecret) {
      this.logger.warn(`[mock] LiveKit token para ${identity} na sala ${roomName} como ${role}`);
      return `mock-token-${identity}-${roomName}-${role}`;
    }

    const at = new AccessToken(this.livekitApiKey, this.livekitApiSecret, { identity });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: role === "publisher",
      canSubscribe: true,
    });
    return await at.toJwt();
  }
}
