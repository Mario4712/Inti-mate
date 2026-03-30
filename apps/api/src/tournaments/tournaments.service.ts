import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../common/database/prisma.service";

/**
 * Item 41 — Torneios com prêmio e leaderboard
 *
 * Regras de negócio:
 * - Criado por admins/criadores com KYC APPROVED
 * - Métricas: NEW_SUBSCRIBERS, REVENUE, CONTENT_VIEWS
 * - Prize pool em BRL (Decimal) — distribuição configurável via prizeDistrib
 * - Regras públicas e auditáveis (campo rulesJson)
 * - Leaderboard calculado em tempo real via PostgreSQL
 * - Ao encerrar: pagamentos automáticos + status PAID
 * - Produção: substituir leaderboard por Redis sorted set para alta escala
 */

type TournamentMetric = "NEW_SUBSCRIBERS" | "REVENUE" | "CONTENT_VIEWS";

// Distribuição padrão: 50% / 30% / 20%
const DEFAULT_PRIZE_DISTRIB = [
  { rank: 1, pct: 50 },
  { rank: 2, pct: 30 },
  { rank: 3, pct: 20 },
];

@Injectable()
export class TournamentsService {
  private readonly logger = new Logger(TournamentsService.name);

  constructor(private prisma: PrismaService) {}

  // ─── CRUD ────────────────────────────────────────────────

  async create(
    adminId: string,
    data: {
      name:         string;
      description:  string;
      metric:       TournamentMetric;
      prizePoolBRL: number;
      startsAt:     Date;
      endsAt:       Date;
      rulesJson:    Record<string, unknown>;
      prizeDistrib?: Array<{ rank: number; pct: number }>;
    },
  ) {
    if (data.startsAt >= data.endsAt) {
      throw new BadRequestException("startsAt deve ser anterior a endsAt");
    }
    if (data.prizePoolBRL < 1) {
      throw new BadRequestException("Prize pool mínimo: R$ 1,00");
    }

    const distrib = data.prizeDistrib ?? DEFAULT_PRIZE_DISTRIB;
    const totalPct = distrib.reduce((s, d) => s + d.pct, 0);
    if (totalPct !== 100) {
      throw new BadRequestException("prizeDistrib deve somar 100%");
    }

    return this.prisma.tournament.create({
      data: {
        name:        data.name,
        description: data.description,
        metric:      data.metric,
        prizePoolBRL: data.prizePoolBRL,
        startsAt:    data.startsAt,
        endsAt:      data.endsAt,
        rulesJson:   data.rulesJson,
        prizeDistrib: distrib,
        status:      "UPCOMING",
      },
    });
  }

  async findAll(status?: string) {
    return this.prisma.tournament.findMany({
      where:   status ? { status: status as any } : undefined,
      orderBy: { startsAt: "desc" },
      select: {
        id: true, name: true, description: true, metric: true,
        prizePoolBRL: true, startsAt: true, endsAt: true,
        status: true, rulesJson: true, prizeDistrib: true,
        _count: { select: { entries: true } },
      },
    });
  }

  async findOne(id: string) {
    const t = await this.prisma.tournament.findUnique({
      where:   { id },
      include: { _count: { select: { entries: true } } },
    });
    if (!t) throw new NotFoundException();
    return t;
  }

  // ─── Inscrição ───────────────────────────────────────────

  async enter(tournamentId: string, creatorId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException();
    if (tournament.status !== "ACTIVE" && tournament.status !== "UPCOMING") {
      throw new BadRequestException("Torneio não está aberto para inscrições");
    }

    // Verifica KYC (AgeVerification APPROVED para criador)
    const kyc = await this.prisma.ageVerification.findFirst({
      where: { userId: creatorId, status: "APPROVED", type: "DOCUMENT" },
    });
    if (!kyc) throw new ForbiddenException("KYC aprovado necessário para participar");

    return this.prisma.tournamentEntry.upsert({
      where:  { tournamentId_creatorId: { tournamentId, creatorId } },
      create: { tournamentId, creatorId, score: 0 },
      update: {},
    });
  }

  async leave(tournamentId: string, creatorId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException();
    if (tournament.status === "ENDED" || tournament.status === "PAID") {
      throw new BadRequestException("Não é possível sair de torneio encerrado");
    }

    await this.prisma.tournamentEntry.deleteMany({ where: { tournamentId, creatorId } });
    return { ok: true };
  }

  // ─── Leaderboard ─────────────────────────────────────────

  async getLeaderboard(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException();

    const entries = await this.buildLeaderboard(tournament as any);
    return {
      tournament: {
        id: tournament.id, name: tournament.name,
        metric: tournament.metric, status: tournament.status,
        prizePoolBRL: tournament.prizePoolBRL, prizeDistrib: tournament.prizeDistrib,
      },
      entries,
    };
  }

  private async buildLeaderboard(tournament: {
    id: string; metric: string; prizePoolBRL: any;
    startsAt: Date; endsAt: Date; prizeDistrib: any;
  }) {
    const registered = await this.prisma.tournamentEntry.findMany({
      where:  { tournamentId: tournament.id },
      select: { creatorId: true },
    });

    const creatorIds = registered.map((e) => e.creatorId);
    if (creatorIds.length === 0) return [];

    const scores = await this.computeScores(creatorIds, tournament.metric, tournament.startsAt, tournament.endsAt);

    // Actualiza scores no DB
    await Promise.all(
      scores.map(({ creatorId, score }, idx) =>
        this.prisma.tournamentEntry.updateMany({
          where: { tournamentId: tournament.id, creatorId },
          data:  { score, rank: idx + 1 },
        }),
      ),
    );

    const profiles = await this.prisma.userProfile.findMany({
      where:  { userId: { in: creatorIds } },
      select: { userId: true, artisticName: true, avatarUrl: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const distrib: Array<{ rank: number; pct: number }> = (tournament.prizeDistrib as any) ?? DEFAULT_PRIZE_DISTRIB;
    const pool = Number(tournament.prizePoolBRL);

    return scores.map(({ creatorId, score }, idx) => {
      const rank   = idx + 1;
      const pctObj = distrib.find((d) => d.rank === rank);
      const prize  = pctObj ? Math.floor(pool * pctObj.pct / 100 * 100) / 100 : 0;
      return {
        rank,
        creatorId,
        artisticName: profileMap.get(creatorId)?.artisticName ?? null,
        avatarUrl:    profileMap.get(creatorId)?.avatarUrl    ?? null,
        score,
        estimatedPrizeBRL: prize,
      };
    });
  }

  private async computeScores(
    creatorIds: string[],
    metric:     string,
    startsAt:   Date,
    endsAt:     Date,
  ): Promise<Array<{ creatorId: string; score: number }>> {
    const end = endsAt < new Date() ? endsAt : new Date();

    switch (metric) {
      case "NEW_SUBSCRIBERS": {
        const rows = await this.prisma.subscription.groupBy({
          by:     ["creatorId"],
          where:  { creatorId: { in: creatorIds }, createdAt: { gte: startsAt, lte: end } },
          _count: { creatorId: true },
        });
        const map = new Map(rows.map((r) => [r.creatorId, r._count.creatorId]));
        return creatorIds.map((id) => ({ creatorId: id, score: map.get(id) ?? 0 }))
          .sort((a, b) => b.score - a.score);
      }

      case "REVENUE": {
        const rows = await this.prisma.tip.groupBy({
          by:    ["creatorId"],
          where: { creatorId: { in: creatorIds }, createdAt: { gte: startsAt, lte: end } },
          _sum:  { amountCents: true },
        });
        const map = new Map(rows.map((r) => [r.creatorId, r._sum.amountCents ?? 0]));
        return creatorIds.map((id) => ({ creatorId: id, score: map.get(id) ?? 0 }))
          .sort((a, b) => b.score - a.score);
      }

      case "CONTENT_VIEWS": {
        const rows = await this.prisma.media.groupBy({
          by:    ["creatorId"],
          where: { creatorId: { in: creatorIds } },
          _sum:  { viewCount: true },
        });
        const map = new Map(rows.map((r) => [r.creatorId, r._sum.viewCount ?? 0]));
        return creatorIds.map((id) => ({ creatorId: id, score: map.get(id) ?? 0 }))
          .sort((a, b) => b.score - a.score);
      }

      default:
        return creatorIds.map((id) => ({ creatorId: id, score: 0 }));
    }
  }

  // ─── Encerramento automático ─────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async closeExpiredTournaments() {
    // Ativa torneios que chegaram na hora de início
    await this.prisma.tournament.updateMany({
      where: { status: "UPCOMING", startsAt: { lte: new Date() } },
      data:  { status: "ACTIVE" },
    });

    const expired = await this.prisma.tournament.findMany({
      where: { status: "ACTIVE", endsAt: { lte: new Date() } },
    });

    for (const t of expired) {
      await this.finalize(t as any);
    }
  }

  private async finalize(tournament: {
    id: string; metric: string; prizePoolBRL: any;
    startsAt: Date; endsAt: Date; prizeDistrib: any;
  }) {
    const leaderboard = await this.buildLeaderboard(tournament);

    await this.prisma.tournament.update({
      where: { id: tournament.id },
      data:  { status: "ENDED" },
    });

    if (leaderboard.length === 0) return;

    const distrib: Array<{ rank: number; pct: number }> = (tournament.prizeDistrib as any) ?? DEFAULT_PRIZE_DISTRIB;
    const pool = Number(tournament.prizePoolBRL);

    await Promise.all(
      leaderboard.slice(0, distrib.length).map(async (w) => {
        const pctObj = distrib.find((d) => d.rank === w.rank);
        if (!pctObj || pctObj.pct === 0) return;

        const prizeBRL   = Math.floor(pool * pctObj.pct) / 100;
        const prizeCents = Math.floor(prizeBRL * 100);

        await this.prisma.$transaction([
          this.prisma.creatorBalance.upsert({
            where:  { creatorId: w.creatorId },
            create: { creatorId: w.creatorId, availableAmount: prizeCents, pendingAmount: 0 },
            update: { availableAmount: { increment: prizeCents } },
          }),
          this.prisma.tournamentEntry.updateMany({
            where: { tournamentId: tournament.id, creatorId: w.creatorId },
            data:  { prizeBRL: prizeBRL, paid: true },
          }),
        ]);

        this.logger.log(`Tournament prize: ${w.creatorId} +R$${prizeBRL.toFixed(2)} (${w.rank}º lugar)`);
      }),
    );

    await this.prisma.tournament.update({
      where: { id: tournament.id },
      data:  { status: "PAID" },
    });

    this.logger.log(`Tournament PAID: ${tournament.id}`);
  }
}
