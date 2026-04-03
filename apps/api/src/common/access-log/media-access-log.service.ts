import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

export interface AccessLogParams {
  mediaId:     string;
  userId?:     string | null;
  sessionId?:  string | null;
  ipAddress?:  string | null;
  userAgent?:  string | null;
  accessType?: "VIEW" | "DOWNLOAD" | "STREAM";
}

@Injectable()
export class MediaAccessLogService {
  private readonly logger = new Logger(MediaAccessLogService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Registra acesso a um conteúdo com dados completos da sessao.
   * Nunca bloqueia a resposta ao usuario — fire-and-forget com catch.
   */
  async logAccess(params: AccessLogParams): Promise<void> {
    try {
      await this.prisma.mediaAccessLog.create({
        data: {
          mediaId:    params.mediaId,
          userId:     params.userId     ?? null,
          sessionId:  params.sessionId  ?? null,
          ipAddress:  params.ipAddress  ?? null,
          userAgent:  params.userAgent  ?? null,
          accessType: params.accessType ?? "VIEW",
        },
      });
    } catch (err) {
      // Nunca falhar a request por causa de log
      this.logger.error(`Falha ao registrar acesso: mediaId=${params.mediaId}`, err);
    }
  }

  /**
   * Atualiza duracao assistida quando o player reporta progresso.
   */
  async updateWatchProgress(
    logId: string,
    durationSec: number,
    completed: boolean,
  ): Promise<void> {
    try {
      await this.prisma.mediaAccessLog.update({
        where: { id: logId },
        data: {
          durationSec,
          completedAt: completed ? new Date() : null,
        },
      });
    } catch (err) {
      this.logger.error(`Falha ao atualizar progresso: logId=${logId}`, err);
    }
  }

  /**
   * Historico de acessos a um conteudo especifico — para auditoria.
   */
  async getAccessHistory(
    mediaId: string,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.mediaAccessLog.findMany({
        where: { mediaId },
        select: {
          id: true,
          userId: true,
          sessionId: true,
          ipAddress: true,
          userAgent: true,
          accessType: true,
          durationSec: true,
          completedAt: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.mediaAccessLog.count({ where: { mediaId } }),
    ]);

    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Historico de acessos de um usuario — para auditoria / compliance LGPD.
   */
  async getUserAccessHistory(
    userId: string,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.mediaAccessLog.findMany({
        where: { userId },
        select: {
          id: true,
          mediaId: true,
          accessType: true,
          ipAddress: true,
          durationSec: true,
          completedAt: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.mediaAccessLog.count({ where: { userId } }),
    ]);

    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Acessos por IP — para investigacao de conteudo proibido.
   */
  async getAccessesByIp(ipAddress: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.mediaAccessLog.findMany({
        where: { ipAddress },
        select: {
          id: true,
          mediaId: true,
          userId: true,
          sessionId: true,
          userAgent: true,
          accessType: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.mediaAccessLog.count({ where: { ipAddress } }),
    ]);

    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}
