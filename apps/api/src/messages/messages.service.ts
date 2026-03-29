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
        OR: [{ creatorId: userId }, { subscriberId: userId }],
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        creator:    { select: { id: true, profile: { select: { artisticName: true, avatarUrl: true } } } },
        subscriber: { select: { id: true, profile: { select: { artisticName: true, avatarUrl: true } } } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, body: true, createdAt: true, status: true, senderId: true },
        },
      },
    });

    return conversations.map((c) => ({
      id:          c.id,
      updatedAt:   c.updatedAt,
      other:       c.creatorId === userId ? c.subscriber : c.creator,
      lastMessage: c.messages[0] ?? null,
    }));
  }

  // ─── Mensagens ────────────────────────────────────────────

  async getMessages(userId: string, conversationId: string, before?: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ creatorId: userId }, { subscriberId: userId }],
        deletedAt: null,
      },
    });
    if (!conv) throw new NotFoundException("Conversa não encontrada");

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(before ? { id: { lt: before } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      select: {
        id: true, senderId: true, body: true,
        status: true, createdAt: true,
        mediaId: true, paidAmount: true,
      },
    });

    // Marca mensagens recebidas como SEEN em background
    this.markSeen(conversationId, userId).catch(() => {});

    // Para mensagens pagas do destinatário, oculta o conteúdo se não foi desbloqueado
    return messages.reverse().map((m) => {
      if (m.paidAmount && m.paidAmount > 0 && m.senderId !== userId) {
        // TODO: verificar PpvPurchase para o mediaId desta mensagem
        return { ...m, body: "", mediaId: null, locked: true };
      }
      return { ...m, locked: false };
    });
  }

  async sendMessage(senderId: string, dto: SendMessageDto) {
    const { recipientId, body, mediaId, paidAmount } = dto;

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
          mediaId:    mediaId    ?? null,
          paidAmount: paidAmount ?? null,
          status:     "SENT",
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

    const creatorId    = a?.role === "CREATOR" ? userA : b?.role === "CREATOR" ? userB : userA;
    const subscriberId = creatorId === userA ? userB : userA;

    const existing = await this.prisma.conversation.findFirst({
      where: { creatorId, subscriberId, deletedAt: null },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { creatorId, subscriberId },
    });
  }

  private async markSeen(conversationId: string, userId: string) {
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status:   { not: "SEEN" },
      },
      data: { status: "SEEN" },
    });
  }
}
