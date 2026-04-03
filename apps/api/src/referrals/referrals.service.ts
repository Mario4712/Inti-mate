import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../common/database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

const REFERRAL_CREDIT_BRL = 15;   // R$ por indicação convertida
const WIN_BACK_INACTIVE_DAYS = 30; // dias sem assinatura para win-back

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─── Item 29: Programa de Referência ─────────────────────

  async getOrCreateCode(userId: string) {
    const existing = await this.prisma.referralCode.findUnique({ where: { userId } });
    if (existing) return existing;

    // Gera código único: primeiras letras do username + 4 dígitos aleatórios
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
    const base = (user?.username ?? userId).toUpperCase().slice(0, 6).replace(/[^A-Z0-9]/g, "");
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    const code = `${base}${suffix}`;

    return this.prisma.referralCode.create({
      data: { userId, code, creditBRL: REFERRAL_CREDIT_BRL },
    });
  }

  async applyReferralCode(newUserId: string, code: string) {
    const refCode = await this.prisma.referralCode.findUnique({ where: { code } });
    if (!refCode) throw new NotFoundException("Código de indicação inválido");
    if (refCode.userId === newUserId) throw new BadRequestException("Não é possível usar seu próprio código");

    const alreadyUsed = await this.prisma.referral.findUnique({ where: { referredId: newUserId } });
    if (alreadyUsed) throw new ConflictException("Você já utilizou um código de indicação");

    await this.prisma.$transaction([
      this.prisma.referral.create({
        data: {
          referralCode: code,
          referrerId:   refCode.userId,
          referredId:   newUserId,
          creditAmount: REFERRAL_CREDIT_BRL,
        },
      }),
      this.prisma.referralCode.update({
        where: { code },
        data:  { totalReferrals: { increment: 1 } },
      }),
    ]);

    return { ok: true, message: "Código aplicado! Crédito será liberado após sua primeira assinatura." };
  }

  // Chamado pelo payments service após 1ª assinatura do usuário indicado
  async grantReferralCredit(referredId: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { referredId },
    });
    if (!referral || referral.creditGranted) return;

    await this.prisma.$transaction([
      this.prisma.referral.update({
        where: { referredId },
        data:  { creditGranted: true },
      }),
      this.prisma.referralCode.update({
        where: { code: referral.referralCode },
        data:  { totalEarned: { increment: referral.creditAmount } },
      }),
      // Crédito para o indicador (como saldo na plataforma — em centavos)
      this.prisma.creatorBalance.upsert({
        where:  { creatorId: referral.referrerId },
        create: { creatorId: referral.referrerId, availableAmount: Math.round(Number(referral.creditAmount) * 100), pendingAmount: 0, totalEarned: Math.round(Number(referral.creditAmount) * 100) },
        update: {
          availableAmount: { increment: Math.round(Number(referral.creditAmount) * 100) },
          totalEarned:     { increment: Math.round(Number(referral.creditAmount) * 100) },
        },
      }),
    ]);
  }

  async getStats(userId: string) {
    const code = await this.prisma.referralCode.findUnique({
      where:   { userId },
      include: { referrals: { select: { createdAt: true, creditGranted: true } } },
    });
    if (!code) return null;

    return {
      code:           code.code,
      link:           `https://inti.mate/r/${code.code}`,
      totalReferrals: code.totalReferrals,
      totalEarned:    Number(code.totalEarned),
      pending:        code.referrals.filter((r) => !r.creditGranted).length,
    };
  }

  // ─── Item 28: Streaks ─────────────────────────────────────

  async recordActivity(userId: string) {
    const streak = await this.prisma.userStreak.findUnique({ where: { userId } });
    const now    = new Date();

    if (!streak) {
      await this.prisma.userStreak.create({
        data: { userId, currentStreak: 1, longestStreak: 1, totalDays: 1 },
      });
      return;
    }

    const lastActive = streak.lastActiveAt;
    const daysDiff   = Math.floor((now.getTime() - lastActive.getTime()) / 86400000);

    if (daysDiff === 0) return; // já registrou hoje

    const newStreak = daysDiff === 1 ? streak.currentStreak + 1 : 1;
    const longest   = Math.max(streak.longestStreak, newStreak);

    await this.prisma.userStreak.update({
      where: { userId },
      data:  {
        currentStreak: newStreak,
        longestStreak: longest,
        totalDays:     { increment: 1 },
        lastActiveAt:  now,
      },
    });

    // Concede badges em marcos
    await this.checkAndGrantBadges(userId, newStreak);
  }

  async getStreak(userId: string) {
    const streak = await this.prisma.userStreak.findUnique({ where: { userId } });
    const badges = await this.prisma.streakBadge.findMany({
      where: { userId }, orderBy: { earnedAt: "desc" },
    });
    return { streak, badges };
  }

  private async checkAndGrantBadges(userId: string, currentStreak: number) {
    const milestones: Array<{ days: number; type: string; discount: number }> = [
      { days:  7,  type: "WEEK_1",   discount: 0  },
      { days: 30,  type: "MONTH_1",  discount: 5  },
      { days: 90,  type: "MONTH_3",  discount: 10 },
      { days: 180, type: "MONTH_6",  discount: 15 },
      { days: 365, type: "YEAR_1",   discount: 20 },
    ];

    for (const m of milestones) {
      if (currentStreak >= m.days) {
        await this.prisma.streakBadge.upsert({
          where:  { userId_badgeType: { userId, badgeType: m.type } },
          create: { userId, badgeType: m.type, discountPct: m.discount },
          update: {},
        });
      }
    }
  }

  // ─── Item 26: Win-back automático ────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async processWinBack() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - WIN_BACK_INACTIVE_DAYS);

    // Assinantes que cancelaram e não retornaram
    const lapsed = await this.prisma.subscription.findMany({
      where: {
        status:      "CANCELLED",
        cancelledAt: { lte: cutoff },
        // Garantir que não tenha nova assinatura ativa
        subscriber: {
          mySubscriptions: {
            none: { status: { in: ["ACTIVE", "PAST_DUE"] } },
          },
        },
      },
      select: { subscriberId: true, creatorId: true },
      distinct: ["subscriberId"],
      take: 100,
    });

    for (const l of lapsed) {
      try {
        await this.notifications.send({
          userId: l.subscriberId,
          type: "SYSTEM",
          title: "Sentimos sua falta!",
          body: "Volte e aproveite um desconto especial de 20% na sua próxima assinatura. Use o código VOLTEI20 no checkout.",
          link: `/creator/${l.creatorId}`,
        });
        this.logger.debug(`Win-back enviado para ${l.subscriberId}`);
      } catch (err) {
        this.logger.error(`Falha win-back ${l.subscriberId}:`, err);
      }
    }
  }

  // ─── Item 26: Pricing inteligente (slots limitados) ──────

  async getSlotConfig(creatorId: string) {
    return this.prisma.subscriptionSlotConfig.findUnique({ where: { creatorId } });
  }

  async upsertSlotConfig(
    creatorId: string,
    data: { maxSlots?: number | null; promoPrice?: number | null; promoEndsAt?: Date | null },
  ) {
    if (data.promoEndsAt && data.promoEndsAt <= new Date()) {
      throw new BadRequestException("Data de término da promoção deve ser futura");
    }

    return this.prisma.subscriptionSlotConfig.upsert({
      where:  { creatorId },
      create: { creatorId, ...data },
      update: data,
    });
  }

  async getAvailableSlots(creatorId: string) {
    const config = await this.prisma.subscriptionSlotConfig.findUnique({ where: { creatorId } });
    if (!config?.maxSlots) return { unlimited: true, available: null, promoPrice: null, promoEndsAt: null };

    const active = await this.prisma.subscription.count({
      where: { creatorId, status: { in: ["ACTIVE", "PAST_DUE"] } },
    });

    const now = new Date();
    const promoActive = config.promoEndsAt && config.promoEndsAt > now;

    return {
      unlimited:   false,
      total:       config.maxSlots,
      active,
      available:   Math.max(0, config.maxSlots - active),
      promoPrice:  promoActive ? Number(config.promoPrice) : null,
      promoEndsAt: promoActive ? config.promoEndsAt        : null,
    };
  }
}
