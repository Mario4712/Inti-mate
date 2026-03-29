import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../common/database/prisma.service";

const L1_RATE         = 0.20;   // 20% nível 1
const L2_RATE         = 0.05;   // 5%  nível 2
const CAP_MONTHLY_BRL = 5000;   // R$ 5.000 por mês

@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger(AffiliatesService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Cadastrar como afiliado ──────────────────────────────

  async register(userId: string, referredByCode?: string) {
    const existing = await this.prisma.affiliate.findUnique({ where: { userId } });
    if (existing) throw new ConflictException("Usuário já é afiliado");

    // KYC obrigatório para se tornar afiliado
    const kyc = await this.prisma.ageVerification.findUnique({ where: { userId } });
    if (!kyc || kyc.status !== "APPROVED") {
      throw new ForbiddenException("Verificação de identidade (KYC) necessária para ser afiliado");
    }

    // Valida código do recrutador (nível 2)
    if (referredByCode) {
      const referrer = await this.prisma.affiliate.findFirst({
        where: { userId: referredByCode, status: "ACTIVE" },
      });
      if (!referrer) throw new BadRequestException("Código de afiliado recrutador inválido");
    }

    return this.prisma.affiliate.create({
      data: {
        userId,
        referredByCode: referredByCode ?? null,
        l1Rate:        L1_RATE,
        l2Rate:        L2_RATE,
        capMonthlyBRL: CAP_MONTHLY_BRL,
      },
    });
  }

  // ─── Calcular e registrar comissões ───────────────────────
  // Chamado pelo payments service após transação confirmada

  async recordCommission(params: {
    sourceUserId:  string;
    transactionId: string;
    grossBRL:      number;
  }) {
    const { sourceUserId, transactionId, grossBRL } = params;

    // Busca código de referência do usuário que gerou a transação
    const referral = await this.prisma.referral.findUnique({
      where: { referredId: sourceUserId },
      include: { code: true },
    });
    if (!referral) return; // usuário sem código de indicação, sem comissão

    const referrerId = referral.code.userId;
    const l1Affiliate = await this.prisma.affiliate.findUnique({
      where: { userId: referrerId, status: "ACTIVE" } as any,
    });
    if (!l1Affiliate) return;

    // Verificar cap mensal
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const earnedThisMonth = await this.prisma.affiliateCommission.aggregate({
      where:  { affiliateId: l1Affiliate.id, createdAt: { gte: monthStart } },
      _sum:   { commissionBRL: true },
    });

    const usedBRL = Number(earnedThisMonth._sum.commissionBRL ?? 0);
    if (usedBRL >= CAP_MONTHLY_BRL) {
      this.logger.debug(`Afiliado ${l1Affiliate.id} atingiu cap mensal`);
      return;
    }

    const l1Commission = Math.min(
      grossBRL * L1_RATE,
      CAP_MONTHLY_BRL - usedBRL,
    );

    await this.prisma.$transaction(async (tx) => {
      // Nível 1
      await tx.affiliateCommission.create({
        data: {
          affiliateId:   l1Affiliate.id,
          sourceUserId,
          transactionId,
          level:         1,
          grossBRL,
          commissionBRL: l1Commission,
        },
      });
      await tx.affiliate.update({
        where: { id: l1Affiliate.id },
        data:  {
          pendingBRL:     { increment: l1Commission },
          totalEarnedBRL: { increment: l1Commission },
        },
      });

      // Nível 2 — se o afiliado L1 foi recrutado por alguém
      if (l1Affiliate.referredByCode) {
        const l2Affiliate = await tx.affiliate.findUnique({
          where: { userId: l1Affiliate.referredByCode, status: "ACTIVE" } as any,
        });
        if (l2Affiliate) {
          const l2Commission = grossBRL * L2_RATE;
          await tx.affiliateCommission.create({
            data: {
              affiliateId:   l2Affiliate.id,
              sourceUserId,
              transactionId,
              level:         2,
              grossBRL,
              commissionBRL: l2Commission,
            },
          });
          await tx.affiliate.update({
            where: { id: l2Affiliate.id },
            data:  {
              pendingBRL:     { increment: l2Commission },
              totalEarnedBRL: { increment: l2Commission },
            },
          });
        }
      }
    });
  }

  // ─── Dashboard do afiliado ────────────────────────────────

  async getDashboard(userId: string) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where:   { userId },
      include: {
        commissions: {
          orderBy: { createdAt: "desc" },
          take:    10,
          select:  { id: true, level: true, commissionBRL: true, paid: true, createdAt: true },
        },
      },
    });
    if (!affiliate) throw new NotFoundException("Usuário não é afiliado");

    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const monthEarned = await this.prisma.affiliateCommission.aggregate({
      where: { affiliateId: affiliate.id, createdAt: { gte: monthStart } },
      _sum:  { commissionBRL: true },
    });

    return {
      id:             affiliate.id,
      status:         affiliate.status,
      pendingBRL:     Number(affiliate.pendingBRL),
      paidBRL:        Number(affiliate.paidBRL),
      totalEarnedBRL: Number(affiliate.totalEarnedBRL),
      thisMonthBRL:   Number(monthEarned._sum.commissionBRL ?? 0),
      capMonthlyBRL:  Number(affiliate.capMonthlyBRL),
      l1Rate:         Number(affiliate.l1Rate),
      l2Rate:         Number(affiliate.l2Rate),
      recentCommissions: affiliate.commissions,
    };
  }

  // ─── Pagamento no ciclo de saque (D+14) ───────────────────

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async processAffiliatePayout() {
    // Paga comissões pendentes com mais de 14 dias (mesmo ciclo do saque normal)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);

    const due = await this.prisma.affiliateCommission.findMany({
      where: { paid: false, createdAt: { lte: cutoff } },
      include: { affiliate: true },
      take: 200,
    });

    const grouped = new Map<string, { affiliateId: string; total: number; ids: string[] }>();
    for (const c of due) {
      const entry = grouped.get(c.affiliateId) ?? { affiliateId: c.affiliateId, total: 0, ids: [] };
      entry.total += Number(c.commissionBRL);
      entry.ids.push(c.id);
      grouped.set(c.affiliateId, entry);
    }

    for (const [affiliateId, batch] of grouped) {
      try {
        await this.prisma.$transaction([
          this.prisma.affiliateCommission.updateMany({
            where: { id: { in: batch.ids } },
            data:  { paid: true, paidAt: new Date() },
          }),
          this.prisma.affiliate.update({
            where: { id: affiliateId },
            data:  {
              pendingBRL: { decrement: batch.total },
              paidBRL:    { increment: batch.total },
            },
          }),
          // TODO: disparar PIX via withdrawals gateway
        ]);
        this.logger.log(`Comissão paga: afiliado ${affiliateId} R$ ${batch.total.toFixed(2)}`);
      } catch (err) {
        this.logger.error(`Falha ao pagar afiliado ${affiliateId}:`, err);
      }
    }
  }
}
