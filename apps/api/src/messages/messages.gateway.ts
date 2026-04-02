import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Logger, UnauthorizedException, UseGuards } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Server, Socket } from "socket.io";
import { PrismaService } from "../common/database/prisma.service";

/**
 * WebSocket gateway for real-time messaging.
 *
 * Events:
 * - Client → Server:
 *   - message:send { recipientId, body, mediaUrl?, pricePaid? }
 *   - message:typing { conversationId }
 *   - message:read { conversationId }
 *
 * - Server → Client:
 *   - message:new { id, conversationId, senderId, body, ... }
 *   - message:typing { conversationId, userId }
 *   - message:read { conversationId }
 *   - error { message }
 */
@WebSocketGateway({
  namespace: "/chat",
  cors: {
    origin: process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000",
    credentials: true,
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  // userId → Set of socket IDs (user can have multiple connections)
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  // ─── Connection lifecycle ────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ??
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        throw new UnauthorizedException("Token não fornecido");
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get("app.jwt.accessSecret"),
      });

      const userId = payload.sub;
      client.data.userId = userId;

      // Track socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Join personal room for targeted messages
      client.join(`user:${userId}`);

      this.logger.log(`Connected: ${userId} (${client.id})`);
    } catch (err) {
      this.logger.warn(`Connection rejected: ${(err as Error).message}`);
      client.emit("error", { message: "Autenticação inválida" });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
      this.logger.log(`Disconnected: ${userId} (${client.id})`);
    }
  }

  // ─── Events ──────────────────────────────────────────────

  @SubscribeMessage("message:send")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recipientId: string; body: string; mediaUrl?: string; pricePaid?: number },
  ) {
    const senderId = client.data.userId;
    if (!senderId) return;

    const { recipientId, body, mediaUrl, pricePaid } = data;

    if (!recipientId || !body?.trim()) {
      client.emit("error", { message: "recipientId e body são obrigatórios" });
      return;
    }

    if (senderId === recipientId) {
      client.emit("error", { message: "Não é possível enviar mensagem para si mesmo" });
      return;
    }

    try {
      // Find or create conversation
      const conv = await this.findOrCreateConversation(senderId, recipientId);

      const message = await this.prisma.$transaction(async (tx) => {
        const msg = await tx.message.create({
          data: {
            conversationId: conv.id,
            senderId,
            body: body.trim(),
            mediaUrl: mediaUrl ?? null,
            pricePaid: pricePaid ?? null,
            status: "SENT",
          },
        });

        await tx.conversation.update({
          where: { id: conv.id },
          data: { updatedAt: new Date() },
        });

        return msg;
      });

      const payload = {
        id: message.id,
        conversationId: conv.id,
        senderId,
        body: message.body,
        mediaUrl: message.mediaUrl,
        pricePaid: message.pricePaid,
        status: message.status,
        createdAt: message.createdAt,
      };

      // Emit to both sender and recipient
      this.server.to(`user:${senderId}`).emit("message:new", payload);
      this.server.to(`user:${recipientId}`).emit("message:new", {
        ...payload,
        // Hide paid message content for recipient until unlocked
        ...(pricePaid && pricePaid > 0
          ? { body: "", mediaUrl: null, locked: true }
          : { locked: false }),
      });
    } catch (err) {
      this.logger.error(`Send message error: ${(err as Error).message}`);
      client.emit("error", { message: "Erro ao enviar mensagem" });
    }
  }

  @SubscribeMessage("message:typing")
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.conversationId) return;

    // Broadcast typing to conversation participants (except sender)
    client.broadcast.to(`conv:${data.conversationId}`).emit("message:typing", {
      conversationId: data.conversationId,
      userId,
    });
  }

  @SubscribeMessage("message:read")
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data.conversationId) return;

    try {
      await this.prisma.message.updateMany({
        where: {
          conversationId: data.conversationId,
          senderId: { not: userId },
          status: { not: "READ" },
        },
        data: { status: "READ" },
      });

      // Notify the other party that messages were read
      const conv = await this.prisma.conversation.findUnique({
        where: { id: data.conversationId },
      });
      if (conv) {
        const otherId = conv.creatorId === userId ? conv.fanId : conv.creatorId;
        this.server.to(`user:${otherId}`).emit("message:read", {
          conversationId: data.conversationId,
        });
      }
    } catch (err) {
      this.logger.error(`Mark read error: ${(err as Error).message}`);
    }
  }

  @SubscribeMessage("conversation:join")
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data.conversationId) {
      client.join(`conv:${data.conversationId}`);
    }
  }

  // ─── Public API for other services ───────────────────────

  /** Emit a super chat to all users in a live session room */
  emitSuperChat(liveSessionId: string, payload: {
    userId: string;
    username: string;
    message: string;
    amount: number;
  }) {
    this.server.to(`live:${liveSessionId}`).emit("live:superchat", payload);
  }

  /** Join a live session room */
  @SubscribeMessage("live:join")
  handleJoinLive(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { liveSessionId: string },
  ) {
    if (data.liveSessionId) {
      client.join(`live:${data.liveSessionId}`);
    }
  }

  @SubscribeMessage("live:leave")
  handleLeaveLive(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { liveSessionId: string },
  ) {
    if (data.liveSessionId) {
      client.leave(`live:${data.liveSessionId}`);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────

  private async findOrCreateConversation(userA: string, userB: string) {
    const [a, b] = await this.prisma.$transaction([
      this.prisma.user.findUnique({ where: { id: userA }, select: { role: true } }),
      this.prisma.user.findUnique({ where: { id: userB }, select: { role: true } }),
    ]);

    const creatorId = a?.role === "CREATOR" ? userA : b?.role === "CREATOR" ? userB : userA;
    const fanId = creatorId === userA ? userB : userA;

    const existing = await this.prisma.conversation.findFirst({
      where: { creatorId, fanId },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { creatorId, fanId },
    });
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }
}
