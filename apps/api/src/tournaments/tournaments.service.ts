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
 * - Criado por admins ou criadores (com KYC APPROVED)
 * - Métricas: SUBSCRIBERS, TIPS, VIEWS, LIKES
 * - Prize pool em centavos (Int) — 80% ao 1º, 15% ao 2º, 5% ao 3º
 * - Regras públicas e auditáveis (campo `rules` JSON)
 * - Leaderboard calculado em tempo real via PostgreSQL
 * - Ao encerrar: pagamentos automáticos via `availableAmount`
 * - Produção: substituir leaderboard por Redis sorted set para alta escala
 */

const PRIZE_SPLITS = [0.8, 0.15, 0.05]; // Top 3

@Injectable()
export class TournamentsService {
  private readonly logger = new Logger(TournamentsService.name);

  constructor(private prisma: PrismaService) {}

  // ─── CRUD ────────────────────────────────────────────────

  async create(
    adminId: string,
    data: {
      title:       string;
      description: string;
      metric:      "SUBSCRIBERS" | "TIPS" | "VIEWS" | "LIKES";
      prizePool:   number; // centavos
      startsAt:    Date;
      endsAt:      Date;
      rules:       Record<string, unknown>;
    },
  ) {
    if (data.startsAt >= data.endsAt) {
      throw new BadRequestException("startsAt deve ser anterior a endsAt");
    }
    if (data.prizePool < 100) {
      throw new BadRequestException("Prize pool mínimo: R$ 1,00");
    }

    return this.prisma.tournament.create({
      data: { ...data, status: "UPCOMING", rules: data.rules },
    });
  }

  async findAll(status?: string) {
    return this.prisma.tournament.findMany({
      where:   status ? { status: status as any } : undefined,
      orderBy: { startsAt: "desc" },
      select: {
        id: true, title: true, description: true, metric: true,
        prizePool: true, startsAt: true, endsAt: true, status: true, rules: true,
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

    // Verifica KYC
    const kyc = await this.prisma.kYCVerification.findFirst({
      where: { userId: creatorId, status: "APPROVED" },
    });
    if (!kyc) throw new ForbiddenException("KYC aprovado necessário para participar");

    const entry = await this.prisma.tournamentEntry.upsert({
      where:  { tournamentId_creatorId: { tournamentId, creatorId } },
      create: { tournamentId, creatorId, score: 0 },
      update: {},
    });

    return entry;
  }

  async leave(tournamentId: string, creatorId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException();
    if (tournament.status === "FINISHED") {
      throw new BadRequestException("Não é possível sair de torneio encerrado");
    }

    await this.prisma.tournamentEntry.deleteMany({
      where: { tournamentId, creatorId },
    });

    return { ok: true };
  }

  // ─── Leaderboard ─────────────────────────────────────────

  async getLeaderboard(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException();

    const entries = await this.buildLeaderboard(tournament);
    return { tournament: { id: tournament.id, title: tournament.title, metric: tournament.metric, status: tournament.status }, entries };
  }

  private async buildLeaderboard(tournament: { id: string; metric: string; startsAt: Date; endsAt: Date }) {
    const { id: tournamentId, metric, startsAt, endsAt } = tournament;

    const registered = await this.prisma.tournamentEntry.findMany({
      where:  { tournamentId },
      select: { creatorId: true },
    });

    const creatorIds = registered.map((e) => e.creatorId);
    if (creatorIds.length === 0) return [];

    // Calcula score real com base na métrica
    const scores = await this.computeScores(creatorIds, metric, startsAt, endsAt);

    // Atualiza scores no DB (para snapshot histórico)
    await Promise.all(
      scores.map(({ creatorId, score }) =>
        this.prisma.tournamentEntry.updateMany({
          where: { tournamentId, creatorId },
          data:  { score },
        }),
      ),
    );

    // Busca perfis
    const profiles = await this.prisma.userProfile.findMany({
      where:  { userId: { in: creatorIds } },
      select: { userId: true, artisticName: true, avatarUrl: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    return scores.map(({ creatorId, score }, idx) => ({
      rank:         idx + 1,
      creatorId,
      artisticName: profileMap.get(creatorId)?.artisticName ?? null,
      avatarUrl:    profileMap.get(creatorId)?.avatarUrl    ?? null,
      score,
    }));
  }

  private async computeScores(
    creatorIds: string[],
    metric:     string,
    startsAt:   Date,
    endsAt:     Date,
  ): Promise<Array<{ creatorId: string; score: number }>> {
    const now = new Date();
    const end = endsAt < now ? endsAt : now;

    switch (metric) {
      case "SUBSCRIBERS": {
        const rows = await this.prisma.subscription.groupBy({
          by:     ["creatorId"],
          where:  { creatorId: { in: creatorIds }, createdAt: { gte: startsAt, lte: end } },
          _count: { creatorId: true },
        });
        const map = new Map(rows.map((r) => [r.creatorId, r._count.creatorId]));
        return creatorIds.map((id) => ({ creatorId: id, score: map.get(id) ?? 0 }))
          .sort((a, b) => b.score - a.score);
      }

      case "TIPS": {
        const rows = await this.prisma.tip.groupBy({
          by:    ["creatorId"],
          where: { creatorId: { in: creatorIds }, createdAt: { gte: startsAt, lte: end } },
          _sum:  { amountCents: true },
        });
        const map = new Map(rows.map((r) => [r.creatorId, r._sum.amountCents ?? 0]));
        return creatorIds.map((id) => ({ creatorId: id, score: map.get(id) ?? 0 }))
          .sort((a, b) => b.score - a.score);
      }

      case "VIEWS": {
        const rows = await this.prisma.media.groupBy({
          by:    ["creatorId"],
          where: { creatorId: { in: creatorIds } },
          _sum:  { viewCount: true },
        });
        const map = new Map(rows.map((r) => [r.creatorId, r._sum.viewCount ?? 0]));
        return creatorIds.map((id) => ({ creatorId: id, score: map.get(id) ?? 0 }))
          .sort((a, b) => b.score - a.score);
      }

      case "LIKES": {
        // Proxy: usar viewCount / 10 como estimativa (substituir por LikeEvent real)
        const rows = await this.prisma.media.groupBy({
          by:    ["creatorId"],
          where: { creatorId: { in: creatorIds } },
          _sum:  { viewCount: true },
        });
        const map = new Map(rows.map((r) => [r.creatorId, Math.floor((r._sum.viewCount ?? 0) / 10)]));
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
    const expired = await this.prisma.tournament.findMany({
      where: { status: "ACTIVE", endsAt: { lte: new Date() } },
    });

    for (const tournament of expired) {
      await this.finalize(tournament);
    }

    // Ativa torneios que chegaram na hora de início
    await this.prisma.tournament.updateMany({
      where: { status: "UPCOMING", startsAt: { lte: new Date() } },
      data:  { status: "ACTIVE" },
    });
  }

  private async finalize(tournament: { id: string; metric: string; prizePool: number; startsAt: Date; endsAt: Date }) {
    const leaderboard = await this.buildLeaderboard(tournament);

    if (leaderboard.length === 0) {
      await this.prisma.tournament.update({
        where: { id: tournament.id },
        data:  { status: "FINISHED" },
      });
      return;
    }

    // Distribui prêmio: 80% / 15% / 5%
    const winners = leaderboard.slice(0, 3);
    await Promise.all(
      winners.map(async (w, idx) => {
        const prize = Math.floor(tournament.prizePool * (PRIZE_SPLITS[idx] ?? 0));
        if (prize === 0) return;

        await this.prisma.$transaction([
          this.prisma.creatorBalance.upsert({
            where:  { creatorId: w.creatorId },
            create: { creatorId: w.creatorId, availableAmount: prize, pendingAmount: 0 },
            update: { availableAmount: { increment: prize } },
          }),
          this.prisma.transaction.create({
            data: {
              userId:      w.creatorId,
              type:        "WITHDRAWAL", // tipo mais próximo — em produção adicionar TOURNAMENT_PRIZE
              amount:      prize,
              currency:    "BRL",
              status:      "COMPLETED",
              description: `Prêmio torneio "${tournament.id}" — ${idx + 1}º lugar`,
            },
          }),
        ]);

        this.logger.log(`Tournament prize: ${w.creatorId} +R$${(prize / 100).toFixed(2)} (${idx + 1}º lugar)`);
      }),
    );

    await this.prisma.tournament.update({
      where: { id: tournament.id },
      data:  { status: "FINISHED" },
    });

    this.logger.log(`Tournament FINISHED: ${tournament.id}`);
  }
}
