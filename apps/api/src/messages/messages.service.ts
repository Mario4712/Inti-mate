import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";
import { StorageService } from "../content/storage.service";
import { SendMessageDto } from "./dto/messages.dto";

const PAGE_SIZE = 30;

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  // ─── Conversas ────────────────────────────────────────────

  async listConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ creatorId: userId }, { fanId: userId }],
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, body: true, createdAt: true, status: true, senderId: true },
        },
        creator: {
          select: {
            id: true, username: true,
            profile: { select: { artisticName: true, avatarUrl: true } },
          },
        },
        fan: {
          select: {
            id: true, username: true,
            profile: { select: { artisticName: true, avatarUrl: true } },
          },
        },
      },
    });

    const unread = await this.prisma.message.groupBy({
      by: ["conversationId"],
      where: {
        conversation: { OR: [{ creatorId: userId }, { fanId: userId }] },
        senderId: { not: userId },
        status: { not: "READ" },
      },
      _count: true,
    });
    const unreadMap = new Map(unread.map((u) => [u.conversationId, u._count]));

    return conversations.map((c) => ({
      id:        c.id,
      updatedAt: c.updatedAt,
      creator: {
        id:           c.creator.id,
        username:     c.creator.username,
        artisticName: c.creator.profile?.artisticName ?? c.creator.username,
        avatarUrl:    c.creator.profile?.avatarUrl    ?? null,
      },
      fan: {
        id:           c.fan.id,
        username:     c.fan.username,
        artisticName: c.fan.profile?.artisticName ?? c.fan.username,
        avatarUrl:    c.fan.profile?.avatarUrl    ?? null,
      },
      lastMessage: c.messages[0] ?? null,
      unreadCount: unreadMap.get(c.id) ?? 0,
    }));
  }

  // ─── Mensagens ────────────────────────────────────────────

  async getMessages(userId: string, conversationId: string, before?: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ creatorId: userId }, { fanId: userId }],
      },
      include: {
        creator: {
          select: {
            id: true, username: true,
            profile: { select: { artisticName: true, avatarUrl: true } },
          },
        },
        fan: {
          select: {
            id: true, username: true,
            profile: { select: { artisticName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!conv) throw new NotFoundException("Conversa não encontrada");

    // Cursor-based pagination: `before` é o ID da mensagem mais antiga da página atual
    let cursorCreatedAt: Date | undefined;
    if (before) {
      const cursorMsg = await this.prisma.message.findUnique({
        where: { id: before },
        select: { createdAt: true },
      });
      cursorCreatedAt = cursorMsg?.createdAt;
    }

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(cursorCreatedAt ? { createdAt: { lt: cursorCreatedAt } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      select: {
        id: true, senderId: true, body: true,
        status: true, createdAt: true,
        mediaUrl: true, pricePaid: true,
      },
    });

    // Marca mensagens recebidas como READ em background
    this.markRead(conversationId, userId).catch(() => {});

    const mappedMessages = messages.map((m) => {
      if (m.pricePaid && m.pricePaid > 0 && m.senderId !== userId) {
        return { ...m, body: "", mediaUrl: null, locked: true };
      }
      return { ...m, locked: false };
    });

    return {
      conversation: {
        id:      conv.id,
        creator: {
          id:           conv.creator.id,
          username:     conv.creator.username,
          artisticName: conv.creator.profile?.artisticName ?? conv.creator.username,
          avatarUrl:    conv.creator.profile?.avatarUrl    ?? null,
        },
        fan: {
          id:           conv.fan.id,
          username:     conv.fan.username,
          artisticName: conv.fan.profile?.artisticName ?? conv.fan.username,
          avatarUrl:    conv.fan.profile?.avatarUrl    ?? null,
        },
      },
      messages: mappedMessages,
    };
  }

  async sendMessage(senderId: string, dto: SendMessageDto) {
    const { recipientId, body, mediaUrl, pricePaid } = dto;

    if (senderId === recipientId) {
      throw new BadRequestException("Não é possível enviar mensagem para si mesmo");
    }

    // Verificar se destinatário existe
    const recipient = await this.prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) throw new NotFoundException("Destinatário não encontrado");

    // Buscar ou criar conversa
    const conv = await this.findOrCreateConversation(senderId, recipientId);

    const message = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId: conv.id,
          senderId,
          body,
          mediaUrl:  mediaUrl  ?? null,
          pricePaid: pricePaid ?? null,
          status:    "SENT",
        },
      });

      await tx.conversation.update({
        where: { id: conv.id },
        data:  { updatedAt: new Date() },
      });

      return msg;
    });

    return {
      id:             message.id,
      conversationId: conv.id,
      body:           message.body,
      status:         message.status,
      createdAt:      message.createdAt,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────

  private async findOrCreateConversation(userA: string, userB: string) {
    // Convenção: creatorId = o usuário com role CREATOR, se existir
    const [a, b] = await this.prisma.$transaction([
      this.prisma.user.findUnique({ where: { id: userA }, select: { role: true } }),
      this.prisma.user.findUnique({ where: { id: userB }, select: { role: true } }),
    ]);

    const creatorId = a?.role === "CREATOR" ? userA : b?.role === "CREATOR" ? userB : userA;
    const fanId     = creatorId === userA ? userB : userA;

    const existing = await this.prisma.conversation.findFirst({
      where: { creatorId, fanId },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { creatorId, fanId },
    });
  }

  private async markRead(conversationId: string, userId: string) {
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status:   { not: "READ" },
      },
      data: { status: "READ" },
    });
  }
}
