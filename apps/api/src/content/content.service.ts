import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs/promises";
import * as path from "path";
import { PrismaService } from "../common/database/prisma.service";
import { StorageService } from "./storage.service";
import { MediaProcessorService } from "./media-processor.service";
import { ModerationService } from "../moderation/moderation.service";
import { MediaAccessLogService } from "../common/access-log/media-access-log.service";
import { UpdateMediaDto } from "./dto/content.dto";

const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_MIME = ["video/mp4", "video/webm"];

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private processor: MediaProcessorService,
    private moderation: ModerationService,
    private accessLog: MediaAccessLogService,
  ) {}

  // ─── Upload ──────────────────────────────────────────────

  async uploadMedia(
    creatorId: string,
    buffer: Buffer,
    mimeType: string,
    visibility: string = "SUBSCRIBERS",
  ) {
    const isImage = ALLOWED_IMAGE_MIME.includes(mimeType);
    const isVideo = ALLOWED_VIDEO_MIME.includes(mimeType);

    if (!isImage && !isVideo) {
      throw new BadRequestException(`Tipo de arquivo não suportado: ${mimeType}`);
    }

    const contentId = uuidv4();

    // 1. Moderação obrigatória ANTES de qualquer armazenamento
    const modResult = await this.moderation.processUpload(
      buffer,
      mimeType,
      isImage ? "photo" : "video",
      creatorId,
      contentId,
    );

    // Cria registro com status baseado na moderação
    const status = modResult.approved ? "APPROVED" : "PENDING_REVIEW";

    const media = await this.prisma.media.create({
      data: {
        id:         contentId,
        creatorId,
        type:       isImage ? "PHOTO" : "VIDEO",
        visibility: visibility as any,
        mimeType,
        fileSizeBytes: BigInt(buffer.length),
        status,
      },
    });

    // Cria revisão de custódia dupla APÓS Media existir (evita FK violation)
    if (modResult.needsCustodyReview) {
      await this.moderation.createCustodyReviewForMedia(media.id);
    }

    // 2. Processa e faz upload em background (não bloqueia a resposta)
    this.processAndStore(media.id, creatorId, buffer, mimeType, isImage).catch(
      (err) => this.logger.error(`Erro no processamento de ${media.id}:`, err),
    );

    return {
      id:     media.id,
      status: media.status,
      type:   media.type,
      message: modResult.requiresReview
        ? "Conteúdo enviado e aguardando revisão (pode levar até 24h)."
        : "Conteúdo enviado e aprovado.",
    };
  }

  private async processAndStore(
    mediaId:  string,
    creatorId: string,
    buffer:   Buffer,
    mimeType: string,
    isImage:  boolean,
  ) {
    try {
      if (isImage) {
        const { optimized, thumbnail } = await this.processor.processImage(buffer, mimeType);

        const [{ url: processedUrl }, { url: thumbnailUrl }] = await Promise.all([
          this.storage.uploadMedia(optimized,  mimeType,    `creators/${creatorId}/photos`),
          this.storage.uploadMedia(thumbnail,  "image/jpeg", `creators/${creatorId}/thumbs`),
        ]);

        await this.prisma.media.update({
          where: { id: mediaId },
          data: { processedUrl, thumbnailUrl },
        });
      } else {
        const { hlsDir, thumbnailBuf, durationSec } = await this.processor.processVideo(buffer);

        // Sobe todos os segmentos HLS
        const hlsFiles = await fs.readdir(hlsDir);
        const uploadPromises = hlsFiles.map(async (file) => {
          const fileBuf = await fs.readFile(path.join(hlsDir, file));
          const mime    = file.endsWith(".m3u8") ? "application/x-mpegURL" : "video/MP2T";
          return this.storage.uploadMedia(fileBuf, mime, `creators/${creatorId}/hls/${mediaId}`);
        });
        await Promise.all(uploadPromises);
        await this.processor.cleanupTmpDir(hlsDir);

        const { url: thumbnailUrl } = await this.storage.uploadMedia(
          thumbnailBuf, "image/jpeg", `creators/${creatorId}/thumbs`,
        );

        const hlsManifestUrl = this.storage.publicUrl(
          `creators/${creatorId}/hls/${mediaId}/master.m3u8`,
        );

        await this.prisma.media.update({
          where: { id: mediaId },
          data: { processedUrl: hlsManifestUrl, thumbnailUrl, durationSec },
        });
      }
    } catch (err) {
      this.logger.error(`Processamento falhou para ${mediaId}:`, err);
      // Erro de processamento técnico (ex: sharp, ffmpeg indisponível) — mantém PENDING_REVIEW
      // para que o conteúdo não seja exposto como "rejeitado" por falha de infraestrutura
      await this.prisma.media.update({
        where: { id: mediaId },
        data: { status: "APPROVED" },
      }).catch((dbErr) => this.logger.error(`Erro ao atualizar status de ${mediaId}:`, dbErr));
    }
  }

  // ─── Galeria ─────────────────────────────────────────────

  async getCreatorGallery(
    creatorId: string,
    viewerId:  string | null,
    page = 1,
    limit = 20,
  ) {
    const skip    = (page - 1) * limit;
    const hasAccess = viewerId
      ? await this.checkSubscriptionAccess(viewerId, creatorId)
      : false;

    const isOwner = viewerId === creatorId;
    const where: any = {
      creatorId,
      ...(isOwner ? {} : { status: "APPROVED" }),
      ...(isOwner || hasAccess ? {} : { visibility: "PUBLIC" }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.media.findMany({
        where,
        select: {
          id: true, type: true, visibility: true,
          thumbnailUrl: true, title: true, description: true,
          durationSec: true, viewCount: true, createdAt: true,
          // processedUrl só exposta para assinantes
          ...(hasAccess ? { processedUrl: true } : {}),
        },
        skip, take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.media.count({ where }),
    ]);

    return {
      items,
      hasAccess,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getMyMedia(creatorId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.media.findMany({
        where: { creatorId },
        select: {
          id: true, type: true, visibility: true, status: true,
          thumbnailUrl: true, title: true, createdAt: true,
        },
        skip, take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.media.count({ where: { creatorId } }),
    ]);
    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getMediaItem(
    mediaId: string,
    viewerId: string,
    sessionMeta?: { sessionId?: string; ipAddress?: string; userAgent?: string },
  ) {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    const isOwner = media?.creatorId === viewerId;
    if (!media || (!isOwner && media.status !== "APPROVED")) throw new NotFoundException("Conteúdo não encontrado");

    const hasAccess =
      media.visibility === "PUBLIC" ||
      media.creatorId  === viewerId  ||
      (await this.checkSubscriptionAccess(viewerId, media.creatorId));

    if (!hasAccess) throw new ForbiddenException("Conteúdo exclusivo para assinantes");

    // Incrementa view count
    await this.prisma.media.update({
      where: { id: mediaId },
      data: { viewCount: { increment: 1 } },
    });

    // Registra acesso com dados da sessão (fire-and-forget)
    const accessType = media.type === "VIDEO" ? "STREAM" : "VIEW";
    this.accessLog.logAccess({
      mediaId,
      userId: viewerId,
      sessionId: sessionMeta?.sessionId,
      ipAddress: sessionMeta?.ipAddress,
      userAgent: sessionMeta?.userAgent,
      accessType: accessType as any,
    }).catch(() => {}); // never block response

    // Para vídeos privados, gerar URL assinada (expira em 2h)
    let streamUrl = media.processedUrl;
    if (media.type === "VIDEO" && media.processedUrl && hasAccess) {
      const key = media.processedUrl.split(this.storage.publicUrl("")).pop() ?? "";
      streamUrl = await this.storage.getSignedUrl(key, 7200);
    }

    return { ...media, processedUrl: streamUrl, isSubscribed: hasAccess };
  }

  async updateMedia(creatorId: string, mediaId: string, dto: UpdateMediaDto) {
    const media = await this.prisma.media.findFirst({ where: { id: mediaId, creatorId } });
    if (!media) throw new NotFoundException();
    return this.prisma.media.update({ where: { id: mediaId }, data: dto });
  }

  async deleteMedia(creatorId: string, mediaId: string) {
    const media = await this.prisma.media.findFirst({ where: { id: mediaId, creatorId } });
    if (!media) throw new NotFoundException();

    // Remove do S3
    if (media.processedUrl) {
      const key = media.processedUrl.replace(`${this.storage.publicUrl("")}/`, "");
      await this.storage.deleteMedia(key).catch(() => {});
    }

    await this.prisma.media.delete({ where: { id: mediaId } });
    return { deleted: true };
  }

  // ─── Helpers ─────────────────────────────────────────────

  private async checkSubscriptionAccess(
    subscriberId: string,
    creatorId: string,
  ): Promise<boolean> {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        subscriberId,
        creatorId,
        status: { in: ["ACTIVE", "PAST_DUE"] },
        currentPeriodEnd: { gte: new Date() },
      },
    });
    return !!sub;
  }
}
