import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";

/**
 * Item 47 — Ferramentas de edição colaborativa com fãs
 *
 * Fluxo:
 * 1. Fã visualiza conteúdo de criador que assina
 * 2. Envia sugestão (corte, legenda, trilha) com payload JSON e nota opcional
 * 3. Criador revisa e aceita ou rejeita
 * 4. Ao aceitar: criador define % de receita compartilhada com o fã
 * 5. Monetização compartilhada — implementação: revenue split configurável
 *    na entrega do conteúdo editado (integração com pagamentos existentes)
 *
 * Tipos de sugestão:
 * - cut:        { start: number, end: number } — corte de trecho
 * - caption:    { text: string, startSec: number, endSec: number } — legenda
 * - soundtrack: { trackName: string, startSec: number } — trilha/música
 *
 * Salvaguardas:
 * - Fã precisa ser assinante ativo do criador para sugerir
 * - revenueSharePct: 0–50% (criador nunca cede mais que metade)
 * - Limite: 10 sugestões pendentes por fã por criador
 */

const MAX_PENDING_PER_FAN = 10;
const MAX_REVENUE_SHARE   = 50;

const ALLOWED_TYPES = ["cut", "caption", "soundtrack"] as const;
type SuggestionType = (typeof ALLOWED_TYPES)[number];

@Injectable()
export class EditSuggestionsService {
  constructor(private prisma: PrismaService) {}

  // ─── Fã: enviar sugestão ─────────────────────────────────

  async createSuggestion(
    fanId:   string,
    mediaId: string,
    type:    string,
    payload: Record<string, unknown>,
    note?:   string,
  ) {
    if (!ALLOWED_TYPES.includes(type as SuggestionType)) {
      throw new BadRequestException(`Tipo inválido. Use: ${ALLOWED_TYPES.join(", ")}`);
    }

    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException("Conteúdo não encontrado");

    // Verifica assinatura ativa
    const sub = await this.prisma.subscription.findFirst({
      where: {
        subscriberId: fanId,
        creatorId:    media.creatorId,
        status:       { in: ["ACTIVE", "PAST_DUE"] },
        currentPeriodEnd: { gte: new Date() },
      },
    });
    if (!sub) {
      throw new ForbiddenException("Assine o criador para enviar sugestões de edição");
    }

    // Limite de sugestões pendentes
    const pending = await this.prisma.editSuggestion.count({
      where: {
        fanId,
        media: { creatorId: media.creatorId },
        status: "PENDING",
      },
    });
    if (pending >= MAX_PENDING_PER_FAN) {
      throw new ForbiddenException(`Máximo de ${MAX_PENDING_PER_FAN} sugestões pendentes por criador`);
    }

    return this.prisma.editSuggestion.create({
      data: { fanId, mediaId, type, payload, note: note ?? null },
    });
  }

  async getFanSuggestions(fanId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.editSuggestion.findMany({
        where:   { fanId },
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        select: {
          id: true, mediaId: true, type: true, payload: true,
          note: true, status: true, revenueSharePct: true,
          acceptedAt: true, rejectedAt: true, createdAt: true,
        },
      }),
      this.prisma.editSuggestion.count({ where: { fanId } }),
    ]);
    return { items, total, pagination: { page, limit, pages: Math.ceil(total / limit) } };
  }

  // ─── Criador: revisar sugestões ──────────────────────────

  async getCreatorSuggestions(
    creatorId: string,
    status?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { media: { creatorId } };
    if (status) where.status = status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.editSuggestion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        select: {
          id: true, mediaId: true, fanId: true, type: true,
          payload: true, note: true, status: true,
          revenueSharePct: true, acceptedAt: true, rejectedAt: true, createdAt: true,
        },
      }),
      this.prisma.editSuggestion.count({ where }),
    ]);
    return { items, total, pagination: { page, limit, pages: Math.ceil(total / limit) } };
  }

  async acceptSuggestion(
    creatorId:      string,
    suggestionId:   string,
    revenueSharePct: number,
  ) {
    if (revenueSharePct < 0 || revenueSharePct > MAX_REVENUE_SHARE) {
      throw new BadRequestException(`revenueSharePct deve estar entre 0 e ${MAX_REVENUE_SHARE}`);
    }

    const suggestion = await this.getSuggestionForCreator(creatorId, suggestionId);
    if (suggestion.status !== "PENDING") {
      throw new BadRequestException("Sugestão já foi revisada");
    }

    return this.prisma.editSuggestion.update({
      where: { id: suggestionId },
      data:  { status: "APPROVED", revenueSharePct, acceptedAt: new Date() },
    });
  }

  async rejectSuggestion(creatorId: string, suggestionId: string) {
    const suggestion = await this.getSuggestionForCreator(creatorId, suggestionId);
    if (suggestion.status !== "PENDING") {
      throw new BadRequestException("Sugestão já foi revisada");
    }

    return this.prisma.editSuggestion.update({
      where: { id: suggestionId },
      data:  { status: "REJECTED", rejectedAt: new Date() },
    });
  }

  private async getSuggestionForCreator(creatorId: string, suggestionId: string) {
    const suggestion = await this.prisma.editSuggestion.findUnique({
      where:   { id: suggestionId },
      include: { media: { select: { creatorId: true } } },
    });
    if (!suggestion) throw new NotFoundException();
    if (suggestion.media.creatorId !== creatorId) throw new ForbiddenException();
    return suggestion;
  }
}
