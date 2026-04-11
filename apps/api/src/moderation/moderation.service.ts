import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";
import { CsamService } from "./csam.service";
import { DualCustodyService } from "./dual-custody.service";

export type ContentType = "photo" | "video" | "message" | "profile_avatar";

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  // Tipos MIME permitidos
  private readonly ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  private readonly ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
  private readonly MAX_IMAGE_SIZE = 20 * 1024 * 1024;  // 20 MB
  private readonly MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB

  constructor(
    private prisma: PrismaService,
    private csamService: CsamService,
    private dualCustody: DualCustodyService,
  ) {}

  /**
   * Pipeline completo de moderação para qualquer upload.
   * Deve ser chamado ANTES de salvar qualquer arquivo.
   *
   * 1. Valida tipo MIME e tamanho
   * 2. Scan de CSAM obrigatório
   * 3. Se flagged → rejeita imediatamente e reporta
   * 4. Se passa → enfileira para revisão humana (status PENDING_REVIEW)
   */
  async processUpload(
    buffer: Buffer,
    mimeType: string,
    contentType: ContentType,
    uploaderId: string,
    contentId: string,
  ): Promise<{ approved: boolean; requiresReview: boolean; needsCustodyReview: boolean; reason?: string }> {
    // 1. Validação de tipo e tamanho
    this.validateFile(buffer, mimeType, contentType);

    // 2. Scan CSAM — OBRIGATÓRIO, sem exceção
    const scanResult = await this.csamService.scan(buffer, mimeType);

    if (scanResult.isCsam) {
      // Reporte imediato às autoridades
      await this.csamService.reportDetection(contentId, contentType, scanResult.hash, undefined);

      // Registra moderação (ModerationLog.contentId não tem FK — pode criar antes do Media)
      await this.prisma.moderationLog.create({
        data: {
          contentId,
          contentType,
          action: "REJECTED",
          reason: "CSAM detectado",
          csamHash: scanResult.hash,
          reportedToAuthority: true,
        },
      });

      this.logger.warn(`Upload rejeitado por CSAM. Uploader: ${uploaderId}, Content: ${contentId}`);

      // Não revelar motivo específico ao usuário (segurança operacional)
      throw new BadRequestException("Conteúdo não permitido pela política da plataforma");
    }

    if (scanResult.isFlagged) {
      // Conteúdo suspeito → log de moderação; custódia criada após Media ser persistido
      await this.prisma.moderationLog.create({
        data: {
          contentId,
          contentType,
          action: "ESCALATED",
          reason: "Conteúdo suspeito — aguarda revisão humana (custódia dupla)",
          csamHash: scanResult.hash,
        },
      });

      // needsCustodyReview=true → ContentService cria ContentCustodyReview após media.create()
      return { approved: false, requiresReview: true, needsCustodyReview: true };
    }

    // 3. Passou no CSAM scan → dupla custódia para todo conteúdo
    await this.prisma.moderationLog.create({
      data: {
        contentId,
        contentType,
        action: "APPROVED",
        csamHash: scanResult.hash,
        reason: "CSAM scan limpo — encaminhado para custódia dupla",
      },
    });

    // needsCustodyReview=true → ContentService cria ContentCustodyReview após media.create()
    return { approved: false, requiresReview: true, needsCustodyReview: true };
  }

  /**
   * Cria o registro de custódia dupla para um conteúdo já persistido no banco.
   * DEVE ser chamado após Media.create() para evitar FK violation.
   */
  async createCustodyReviewForMedia(mediaId: string): Promise<void> {
    await this.dualCustody.createReview(mediaId);
  }

  /**
   * Processa denúncia de usuário contra conteúdo existente.
   */
  async processReport(
    contentId: string,
    contentType: ContentType,
    reporterId: string,
    reason: string,
  ) {
    await this.prisma.moderationLog.create({
      data: {
        contentId,
        contentType,
        action: "ESCALATED",
        reason: `Denúncia de usuário ${reporterId}: ${reason}`,
      },
    });

    this.logger.log(`Denúncia registrada: contentId=${contentId}, tipo=${contentType}`);
    return { message: "Denúncia recebida. Nossa equipe analisará em até 24h." };
  }

  // ─── Validação de arquivo ────────────────────────────────

  private validateFile(buffer: Buffer, mimeType: string, contentType: ContentType) {
    const isImage = contentType === "photo" || contentType === "profile_avatar";
    const isVideo = contentType === "video";

    if (isImage) {
      if (!this.ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        throw new BadRequestException(`Tipo de imagem não suportado: ${mimeType}`);
      }
      if (buffer.length > this.MAX_IMAGE_SIZE) {
        throw new BadRequestException("Imagem excede o tamanho máximo de 20 MB");
      }
    }

    if (isVideo) {
      if (!this.ALLOWED_VIDEO_TYPES.includes(mimeType)) {
        throw new BadRequestException(`Tipo de vídeo não suportado: ${mimeType}`);
      }
      if (buffer.length > this.MAX_VIDEO_SIZE) {
        throw new BadRequestException("Vídeo excede o tamanho máximo de 2 GB");
      }
    }
  }
}
