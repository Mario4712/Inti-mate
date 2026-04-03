import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";

type Decision = "APPROVE" | "REJECT" | "ESCALATE";

@Injectable()
export class DualCustodyService {
  private readonly logger = new Logger(DualCustodyService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Cria registro de custódia dupla quando conteúdo entra na fila de revisão.
   * Chamado automaticamente pelo pipeline de moderação.
   */
  async createReview(mediaId: string): Promise<void> {
    const existing = await this.prisma.contentCustodyReview.findUnique({
      where: { mediaId },
    });
    if (existing) return; // já existe revisão para este conteúdo

    await this.prisma.contentCustodyReview.create({
      data: { mediaId },
    });

    this.logger.log(`Custódia dupla criada para media=${mediaId}`);
  }

  /**
   * Fila de conteúdos pendentes para um moderador.
   * Exclui conteúdos que o moderador já revisou (impede auto-aprovação).
   */
  async getReviewQueue(moderatorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where = {
      finalDecision: null,
      // Não mostrar conteúdo que este moderador já revisou
      NOT: {
        OR: [
          { reviewer1Id: moderatorId },
          { reviewer2Id: moderatorId },
        ],
      },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contentCustodyReview.findMany({
        where,
        include: {
          media: {
            select: {
              id: true,
              type: true,
              mimeType: true,
              thumbnailUrl: true,
              creatorId: true,
              createdAt: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "asc" }, // FIFO — mais antigo primeiro
      }),
      this.prisma.contentCustodyReview.count({ where }),
    ]);

    return {
      items: items.map((r) => ({
        reviewId: r.id,
        mediaId: r.mediaId,
        media: r.media,
        hasFirstReview: !!r.reviewer1Id,
        createdAt: r.createdAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Moderador submete sua decisão.
   * - Se é o primeiro revisor: grava decisão 1, aguarda segundo.
   * - Se é o segundo revisor: grava decisão 2, resolve automaticamente.
   * - Mesmo moderador NÃO pode revisar duas vezes o mesmo conteúdo.
   */
  async submitDecision(
    reviewId: string,
    moderatorId: string,
    decision: Decision,
    reason?: string,
  ) {
    const review = await this.prisma.contentCustodyReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) throw new NotFoundException("Revisão não encontrada");
    if (review.finalDecision) throw new BadRequestException("Revisão já finalizada");

    // Impede mesmo moderador revisar duas vezes
    if (review.reviewer1Id === moderatorId || review.reviewer2Id === moderatorId) {
      throw new ForbiddenException("Você já revisou este conteúdo");
    }

    const now = new Date();

    // Slot 1 vazio: é o primeiro revisor
    if (!review.reviewer1Id) {
      await this.prisma.contentCustodyReview.update({
        where: { id: reviewId },
        data: {
          reviewer1Id: moderatorId,
          decision1: decision,
          reason1: reason ?? null,
          reviewedAt1: now,
        },
      });

      this.logger.log(
        `Custódia: 1a revisão media=${review.mediaId} mod=${moderatorId} decisão=${decision}`,
      );

      return {
        status: "AWAITING_SECOND_REVIEW",
        message: "Decisão registrada. Aguardando segundo revisor.",
      };
    }

    // Slot 2: é o segundo revisor — resolve
    await this.prisma.contentCustodyReview.update({
      where: { id: reviewId },
      data: {
        reviewer2Id: moderatorId,
        decision2: decision,
        reason2: reason ?? null,
        reviewedAt2: now,
      },
    });

    this.logger.log(
      `Custódia: 2a revisão media=${review.mediaId} mod=${moderatorId} decisão=${decision}`,
    );

    // Resolve automaticamente
    return this.resolveReview(reviewId);
  }

  /**
   * Resolve a decisão final baseada nas duas revisões independentes.
   *
   * Regras:
   * - Ambos APPROVE → APPROVE
   * - Ambos REJECT → REJECT
   * - Qualquer ESCALATE → ESCALATE (precisa de admin)
   * - Divergência (1 APPROVE + 1 REJECT) → ESCALATE + notifica admin
   */
  private async resolveReview(reviewId: string) {
    const review = await this.prisma.contentCustodyReview.findUnique({
      where: { id: reviewId },
    });
    if (!review || !review.decision1 || !review.decision2) {
      throw new BadRequestException("Revisão incompleta");
    }

    const d1 = review.decision1;
    const d2 = review.decision2;
    const now = new Date();

    let finalDecision: Decision;
    let conflictNote: string | null = null;

    if (d1 === d2) {
      // Unanimidade
      finalDecision = d1 as Decision;
    } else if (d1 === "ESCALATE" || d2 === "ESCALATE") {
      finalDecision = "ESCALATE";
      conflictNote = `Escalado: revisor1=${d1}, revisor2=${d2}`;
    } else {
      // Divergência APPROVE vs REJECT → escala para admin
      finalDecision = "ESCALATE";
      conflictNote = `Divergência: revisor1=${d1} (${review.reviewer1Id}), revisor2=${d2} (${review.reviewer2Id})`;
    }

    // Atualiza revisão
    await this.prisma.contentCustodyReview.update({
      where: { id: reviewId },
      data: {
        finalDecision,
        resolvedAt: now,
        resolvedBy: "SYSTEM",
        conflictNote,
      },
    });

    // Aplica decisão no conteúdo
    const contentStatus =
      finalDecision === "APPROVE" ? "APPROVED"
      : finalDecision === "REJECT" ? "REJECTED"
      : "FLAGGED"; // ESCALATE → mantém flagged para admin

    await this.prisma.media.update({
      where: { id: review.mediaId },
      data: { status: contentStatus },
    });

    // Registra no log de moderação
    await this.prisma.moderationLog.create({
      data: {
        contentId: review.mediaId,
        contentType: "dual_custody",
        action: finalDecision === "APPROVE" ? "APPROVED"
              : finalDecision === "REJECT"  ? "REJECTED"
              : "ESCALATED",
        reason: JSON.stringify({
          type: "dual_custody_resolution",
          reviewer1: { id: review.reviewer1Id, decision: d1, reason: review.reason1 },
          reviewer2: { id: review.reviewer2Id, decision: d2, reason: review.reason2 },
          conflictNote,
        }),
      },
    });

    this.logger.log(
      `Custódia resolvida: media=${review.mediaId} decisão=${finalDecision}${conflictNote ? ` (${conflictNote})` : ""}`,
    );

    return {
      status: "RESOLVED",
      finalDecision,
      conflictNote,
      contentStatus,
    };
  }

  /**
   * Admin resolve manualmente um conflito (quando ESCALATE).
   */
  async adminResolve(
    reviewId: string,
    adminId: string,
    decision: "APPROVE" | "REJECT",
    reason: string,
  ) {
    const review = await this.prisma.contentCustodyReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) throw new NotFoundException("Revisão não encontrada");
    if (review.finalDecision && review.finalDecision !== "ESCALATE") {
      throw new BadRequestException("Revisão já finalizada sem conflito");
    }

    const now = new Date();
    const contentStatus = decision === "APPROVE" ? "APPROVED" : "REJECTED";

    await this.prisma.$transaction([
      this.prisma.contentCustodyReview.update({
        where: { id: reviewId },
        data: {
          finalDecision: decision,
          resolvedAt: now,
          resolvedBy: adminId,
          conflictNote: review.conflictNote
            ? `${review.conflictNote} | Admin ${adminId}: ${decision} — ${reason}`
            : `Admin ${adminId}: ${decision} — ${reason}`,
        },
      }),
      this.prisma.media.update({
        where: { id: review.mediaId },
        data: { status: contentStatus },
      }),
      this.prisma.moderationLog.create({
        data: {
          contentId: review.mediaId,
          contentType: "dual_custody_admin",
          action: decision === "APPROVE" ? "APPROVED" : "REJECTED",
          moderatorId: adminId,
          reason: `Resolução admin de conflito de custódia: ${reason}`,
        },
      }),
    ]);

    this.logger.log(
      `Custódia admin: media=${review.mediaId} admin=${adminId} decisão=${decision}`,
    );

    return { status: "RESOLVED_BY_ADMIN", finalDecision: decision, contentStatus };
  }

  /**
   * Estatísticas da fila de custódia para dashboard admin.
   */
  async getStats() {
    const [pending, resolved, escalated] = await this.prisma.$transaction([
      this.prisma.contentCustodyReview.count({ where: { finalDecision: null } }),
      this.prisma.contentCustodyReview.count({ where: { NOT: { finalDecision: null } } }),
      this.prisma.contentCustodyReview.count({ where: { finalDecision: "ESCALATE" } }),
    ]);

    return { pending, resolved, escalated };
  }
}
