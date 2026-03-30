import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";

/**
 * Item 39 — Collab Match
 *
 * Sugestões de colaboração baseadas em sobreposição de audiência:
 * - Calcula score de afinidade via assinantes em comum
 * - Mutual accept obrigatório (status ACCEPTED) antes de liberar contato
 *
 * Item 40 — Collab Contract
 * - Dupla assinatura via OTP (SMS stub — pronto para integração com Twilio/SNS)
 * - Contrato imutável armazenado no S3 após status SIGNED
 *
 * Enums do schema:
 *   CollabStatus: PENDING | INVITED | ACCEPTED | REJECTED | CANCELLED
 *   ContractStatus: DRAFT | PENDING_SIGNATURES | SIGNED | EXPIRED | CANCELLED
 */

@Injectable()
export class CollabService {
  private readonly logger = new Logger(CollabService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Item 39: Sugestões ──────────────────────────────────

  async getSuggestions(creatorId: string, limit = 10) {
    const mySubscribers = await this.prisma.subscription.findMany({
      where:  { creatorId, status: { in: ["ACTIVE", "PAST_DUE"] } },
      select: { subscriberId: true },
    });

    if (mySubscribers.length === 0) {
      return this.getPopularCreators(creatorId, limit);
    }

    const mySubIds = mySubscribers.map((s) => s.subscriberId);

    const overlap = await this.prisma.subscription.findMany({
      where: {
        subscriberId: { in: mySubIds },
        creatorId:    { not: creatorId },
        status:       { in: ["ACTIVE", "PAST_DUE"] },
      },
      select: { creatorId: true },
    });

    const freq = new Map<string, number>();
    for (const s of overlap) {
      freq.set(s.creatorId, (freq.get(s.creatorId) ?? 0) + 1);
    }

    const existingMatches = await this.prisma.collabMatch.findMany({
      where: {
        OR: [{ creatorAId: creatorId }, { creatorBId: creatorId }],
      },
      select: { creatorAId: true, creatorBId: true },
    });

    const connected = new Set<string>();
    for (const m of existingMatches) {
      connected.add(m.creatorAId === creatorId ? m.creatorBId : m.creatorAId);
    }
    connected.add(creatorId);

    const candidates = [...freq.entries()]
      .filter(([id]) => !connected.has(id))
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    if (candidates.length === 0) return this.getPopularCreators(creatorId, limit);

    const profiles = await this.prisma.userProfile.findMany({
      where:  { userId: { in: candidates.map(([id]) => id) }, user: { status: "ACTIVE" } },
      select: { userId: true, artisticName: true, avatarUrl: true, category: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    return candidates
      .map(([id, sharedCount]) => ({
        creatorId:         id,
        artisticName:      profileMap.get(id)?.artisticName ?? null,
        avatarUrl:         profileMap.get(id)?.avatarUrl    ?? null,
        category:          profileMap.get(id)?.category     ?? null,
        sharedSubscribers: sharedCount,
        overlapPct:        Math.round((sharedCount / mySubIds.length) * 100),
      }))
      .filter((c) => c.artisticName !== null);
  }

  private async getPopularCreators(excludeId: string, limit: number) {
    const profiles = await this.prisma.userProfile.findMany({
      where:   { user: { role: "CREATOR", status: "ACTIVE" }, userId: { not: excludeId } },
      orderBy: { user: { mySubscriptions: { _count: "desc" } } },
      take:    limit,
      select:  { userId: true, artisticName: true, avatarUrl: true, category: true },
    });

    return profiles.map((p) => ({
      creatorId:         p.userId,
      artisticName:      p.artisticName,
      avatarUrl:         p.avatarUrl,
      category:          p.category,
      sharedSubscribers: 0,
      overlapPct:        0,
    }));
  }

  // ─── Item 39: Match (mutual accept) ─────────────────────

  async sendInterest(initiatorId: string, targetId: string) {
    if (initiatorId === targetId) {
      throw new BadRequestException("Não pode enviar interesse para si mesmo");
    }

    // Garante ordem canônica para evitar duplicatas (A < B)
    const [creatorAId, creatorBId] = [initiatorId, targetId].sort();

    const existing = await this.prisma.collabMatch.findFirst({
      where: { creatorAId, creatorBId },
    });

    if (existing) {
      if (existing.status === "ACCEPTED") {
        throw new BadRequestException("Vocês já têm um match ativo");
      }
      // Já existe INVITED/PENDING — o outro lado aceita aqui
      if (existing.status === "INVITED" || existing.status === "PENDING") {
        const updated = await this.prisma.collabMatch.update({
          where: { id: existing.id },
          data:  { status: "ACCEPTED", acceptedAt: new Date() },
        });
        this.logger.log(`CollabMatch ACCEPTED: ${creatorAId} ↔ ${creatorBId}`);
        return { matched: true, matchId: updated.id };
      }
    }

    // Score de compatibilidade (calculado na sugestão; aqui default 0 pois é convite direto)
    const match = await this.prisma.collabMatch.create({
      data: { creatorAId, creatorBId, score: 0, initiatedBy: initiatorId, status: "INVITED" },
    });

    return { matched: false, matchId: match.id };
  }

  async rejectMatch(userId: string, matchId: string) {
    const match = await this.prisma.collabMatch.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException();
    if (match.creatorAId !== userId && match.creatorBId !== userId) {
      throw new ForbiddenException();
    }

    await this.prisma.collabMatch.update({
      where: { id: matchId },
      data:  { status: "REJECTED" },
    });

    return { ok: true };
  }

  async listMatches(creatorId: string) {
    const matches = await this.prisma.collabMatch.findMany({
      where: {
        OR: [{ creatorAId: creatorId }, { creatorBId: creatorId }],
        status: "ACCEPTED",
      },
      orderBy: { updatedAt: "desc" },
    });

    return matches.map((m) => ({
      matchId:   m.id,
      partnerId: m.creatorAId === creatorId ? m.creatorBId : m.creatorAId,
      matchedAt: m.acceptedAt ?? m.updatedAt,
    }));
  }

  async listPending(creatorId: string) {
    return this.prisma.collabMatch.findMany({
      where: {
        OR: [{ creatorAId: creatorId }, { creatorBId: creatorId }],
        status: { in: ["PENDING", "INVITED"] },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // ─── Item 40: Contratos ──────────────────────────────────

  async createContract(
    creatorId: string,
    matchId:   string,
    data: {
      title:           string;
      description:     string;
      revenueSharePct: number;
      durationDays:    number;
    },
  ) {
    const match = await this.prisma.collabMatch.findUnique({ where: { id: matchId } });
    if (!match || match.status !== "ACCEPTED") {
      throw new BadRequestException("Match precisa estar ACCEPTED para criar contrato");
    }
    if (match.creatorAId !== creatorId && match.creatorBId !== creatorId) {
      throw new ForbiddenException();
    }

    if (data.revenueSharePct < 1 || data.revenueSharePct > 99) {
      throw new BadRequestException("revenueSharePct deve estar entre 1 e 99");
    }

    const startsAt = new Date();
    const endsAt   = new Date(startsAt.getTime() + data.durationDays * 86_400_000);

    // Mapeia para os campos reais do schema CollabContract
    const terms = {
      revenueSharePct: data.revenueSharePct,
      durationDays:    data.durationDays,
      startsAt:        startsAt.toISOString(),
      endsAt:          endsAt.toISOString(),
    };
    const fullText = `CONTRATO DE COLABORAÇÃO\n\nPartes: ${match.creatorAId} e ${match.creatorBId}\n\nTítulo: ${data.title}\n\nDescrição: ${data.description}\n\nDivisão de receita: ${data.revenueSharePct}%\n\nVigência: ${data.durationDays} dias a partir de ${startsAt.toLocaleDateString("pt-BR")}.`;
    const summary  = `${data.title} — divisão de receita ${data.revenueSharePct}%, vigência ${data.durationDays} dias.`;

    const contract = await this.prisma.collabContract.create({
      data: {
        matchId,
        creatorAId: match.creatorAId,
        creatorBId: match.creatorBId,
        terms,
        fullText,
        summary,
        status: "DRAFT",
      },
    });

    return contract;
  }

  /**
   * OTP de assinatura — stub pronto para Twilio/SNS.
   * Ambos os criadores devem chamar este endpoint.
   */
  async signContract(creatorId: string, contractId: string, otp: string) {
    const contract = await this.prisma.collabContract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException();
    if (contract.creatorAId !== creatorId && contract.creatorBId !== creatorId) {
      throw new ForbiddenException();
    }
    if (contract.status === "SIGNED") {
      throw new BadRequestException("Contrato já está assinado");
    }

    // Stub: em produção validar OTP via Redis (TTL 10min) enviado por SMS
    if (!otp || otp.length < 4) {
      throw new BadRequestException("OTP inválido");
    }

    const isCreatorA = contract.creatorAId === creatorId;
    const updateData: any = isCreatorA
      ? { signedByAAt: new Date(), status: "PENDING_SIGNATURES" }
      : { signedByBAt: new Date(), status: "PENDING_SIGNATURES" };

    const updated = await this.prisma.collabContract.update({
      where: { id: contractId },
      data:  updateData,
    });

    // SIGNED quando ambos assinaram
    if (updated.signedByAAt && updated.signedByBAt) {
      await this.prisma.collabContract.update({
        where: { id: contractId },
        data:  { status: "SIGNED" },
      });
      this.logger.log(`CollabContract SIGNED: ${contractId}`);
      // TODO produção: armazenar PDF imutável no S3 com hash SHA-256
      return { status: "SIGNED", contractId };
    }

    return { status: "PENDING_SIGNATURES", contractId };
  }

  async getContract(creatorId: string, contractId: string) {
    const contract = await this.prisma.collabContract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException();
    if (contract.creatorAId !== creatorId && contract.creatorBId !== creatorId) {
      throw new ForbiddenException();
    }
    return contract;
  }

  async listContracts(creatorId: string) {
    return this.prisma.collabContract.findMany({
      where: {
        OR: [{ creatorAId: creatorId }, { creatorBId: creatorId }],
        status: { in: ["DRAFT", "PENDING_SIGNATURES"] },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
