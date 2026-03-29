import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ─── Dashboard principal (Item 25) ───────────────────────

  async getCreatorDashboard(creatorId: string) {
    const [revenue, subscribers, churn, topContent, activityHours] = await Promise.all([
      this.getRevenueBreakdown(creatorId),
      this.getSubscriberFunnel(creatorId),
      this.getChurnAnalysis(creatorId),
      this.getTopContent(creatorId),
      this.getPeakActivityHours(creatorId),
    ]);

    return { revenue, subscribers, churn, topContent, activityHours };
  }

  // ─── Receita por período ─────────────────────────────────

  async getRevenueBreakdown(creatorId: string) {
    const now   = new Date();
    const day30 = new Date(now); day30.setDate(now.getDate() - 30);
    const day60 = new Date(now); day60.setDate(now.getDate() - 60);

    const [current30, previous30, byType] = await this.prisma.$transaction([
      this.prisma.transaction.aggregate({
        where:  { creatorId, status: "PAID", createdAt: { gte: day30 } },
        _sum:   { netAmount: true },
      }),
      this.prisma.transaction.aggregate({
        where:  { creatorId, status: "PAID", createdAt: { gte: day60, lt: day30 } },
        _sum:   { netAmount: true },
      }),
      this.prisma.transaction.groupBy({
        by:    ["type"],
        where: { creatorId, status: "PAID", createdAt: { gte: day30 } },
        _sum:  { netAmount: true },
        orderBy: { _sum: { netAmount: "desc" } },
      }),
    ]);

    const curr = Number(current30._sum.netAmount ?? 0);
    const prev = Number(previous30._sum.netAmount ?? 0);

    return {
      last30Days:   curr,
      prev30Days:   prev,
      growthPct:    prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null,
      byType: byType.map((t) => ({
        type:   t.type,
        amount: Number(t._sum.netAmount ?? 0),
      })),
    };
  }

  // ─── Funil de conversão ──────────────────────────────────

  async getSubscriberFunnel(creatorId: string) {
    const now   = new Date();
    const day30 = new Date(now); day30.setDate(now.getDate() - 30);

    const [active, newThisMonth, cancelled, totalEver] =
      await this.prisma.$transaction([
        this.prisma.subscription.count({
          where: { creatorId, status: { in: ["ACTIVE", "PAST_DUE"] } },
        }),
        this.prisma.subscription.count({
          where: { creatorId, createdAt: { gte: day30 } },
        }),
        this.prisma.subscription.count({
          where: { creatorId, status: "CANCELLED", cancelledAt: { gte: day30 } },
        }),
        this.prisma.subscription.count({ where: { creatorId } }),
      ]);

    return { active, newThisMonth, cancelledThisMonth: cancelled, totalEver };
  }

  // ─── Churn analysis ──────────────────────────────────────

  async getChurnAnalysis(creatorId: string) {
    // Churn rate mensal = cancelamentos / ativos início do mês
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [activeAtStart, cancelledThisMonth] = await this.prisma.$transaction([
      this.prisma.subscription.count({
        where: {
          creatorId,
          createdAt: { lt: monthStart },
          OR: [
            { status: { in: ["ACTIVE", "PAST_DUE"] } },
            { cancelledAt: { gte: monthStart } },
          ],
        },
      }),
      this.prisma.subscription.count({
        where: { creatorId, status: "CANCELLED", cancelledAt: { gte: monthStart } },
      }),
    ]);

    const churnRate = activeAtStart > 0
      ? Math.round((cancelledThisMonth / activeAtStart) * 100 * 10) / 10
      : 0;

    // Tempo médio de assinatura (dias)
    const subs = await this.prisma.subscription.findMany({
      where:  { creatorId, status: "CANCELLED" },
      select: { createdAt: true, cancelledAt: true },
      take:   100,
      orderBy: { cancelledAt: "desc" },
    });

    const avgDays = subs.length > 0
      ? Math.round(
          subs.reduce((sum, s) => {
            const days = s.cancelledAt
              ? (s.cancelledAt.getTime() - s.createdAt.getTime()) / 86400000
              : 0;
            return sum + days;
          }, 0) / subs.length,
        )
      : null;

    return { churnRate, avgSubscriptionDays: avgDays };
  }

  // ─── Conteúdo mais engajador ─────────────────────────────

  async getTopContent(creatorId: string, limit = 5) {
    return this.prisma.media.findMany({
      where:   { creatorId, status: "APPROVED" },
      orderBy: { viewCount: "desc" },
      take:    limit,
      select:  { id: true, title: true, type: true, thumbnailUrl: true, viewCount: true, createdAt: true },
    });
  }

  // ─── Horários de pico de atividade ───────────────────────
  // Baseado no horário de criação de views dos conteúdos do criador

  async getPeakActivityHours(creatorId: string) {
    // Agrupa as views por hora do dia usando SQL raw
    const result = await this.prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
      SELECT EXTRACT(HOUR FROM m."createdAt") AS hour, COUNT(*) AS count
      FROM "Media" m
      WHERE m."creatorId" = ${creatorId}
        AND m."status" = 'APPROVED'
      GROUP BY hour
      ORDER BY hour ASC
    `;

    return result.map((r) => ({
      hour:  Number(r.hour),
      views: Number(r.count),
    }));
  }
}
