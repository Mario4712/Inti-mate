import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../common/database/prisma.service";
import { PagarmeStrategy } from "./strategies/pagarme.strategy";
import { StripeStrategy } from "./strategies/stripe.strategy";
import { TransactionType } from "@intimare/database";

// Taxa da plataforma: 20%
const PLATFORM_FEE_PERCENT = 0.20;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private pagarme: PagarmeStrategy,
    private stripe: StripeStrategy,
  ) {}

  // ─── Assinatura ──────────────────────────────────────────

  async createSubscription(
    subscriberId: string,
    planId: string,
    paymentMethod: { provider: "pagarme" | "stripe"; token: string },
  ) {
    const plan = await this.prisma.creatorPlan.findUnique({
      where: { id: planId, isActive: true },
    });
    if (!plan) throw new NotFoundException("Plano não encontrado");

    // Verifica se já tem assinatura ativa
    const existing = await this.prisma.subscription.findFirst({
      where: {
        subscriberId,
        creatorId: plan.creatorId,
        status: { in: ["ACTIVE", "PAST_DUE"] },
      },
    });
    if (existing) throw new BadRequestException("Você já possui uma assinatura ativa para este criador");

    const grossAmount = plan.priceMonthly;
    const platformFee = Math.round(grossAmount * PLATFORM_FEE_PERCENT);
    const netAmount = grossAmount - platformFee;

    // Cria cobrança no gateway
    const gateway = this.selectGateway(paymentMethod.provider);
    const charge = await gateway.charge({
      amount: grossAmount,
      currency: "BRL",
      token: paymentMethod.token,
      description: `Assinatura ${plan.name} — Inti.mate`,
      metadata: { planId, subscriberId },
    });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const [subscription] = await this.prisma.$transaction([
      this.prisma.subscription.create({
        data: {
          subscriberId,
          creatorId: plan.creatorId,
          planId,
          status: charge.status === "paid" ? "ACTIVE" : "PAST_DUE",
          interval: "MONTHLY",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          gatewaySubscriptionId: charge.id,
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId: subscriberId,
          creatorId: plan.creatorId,
          type: TransactionType.SUBSCRIPTION,
          status: charge.status === "paid" ? "PAID" : "PENDING",
          grossAmount,
          platformFee,
          netAmount,
          description: `Assinatura: ${plan.name}`,
          gatewayProvider: paymentMethod.provider,
          gatewayTxId: charge.id,
          gatewayPayload: charge.raw,
        },
      }),
    ]);

    // Credita saldo do criador se pago
    if (charge.status === "paid") {
      await this.creditCreatorBalance(plan.creatorId, netAmount);
    }

    this.logger.log(`Assinatura criada: ${subscription.id} | ${subscriberId} → ${plan.creatorId}`);
    return subscription;
  }

  async cancelSubscription(subscriberId: string, subscriptionId: string, reason?: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, subscriberId },
    });
    if (!sub) throw new NotFoundException("Assinatura não encontrada");
    if (sub.status === "CANCELLED") throw new BadRequestException("Assinatura já cancelada");

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });
  }

  // ─── PPV ─────────────────────────────────────────────────

  async purchasePpv(
    buyerId: string,
    contentId: string,
    paymentMethod: { provider: "pagarme" | "stripe"; token: string },
  ) {
    const content = await this.prisma.ppvContent.findUnique({
      where: { id: contentId, status: "APPROVED" },
    });
    if (!content) throw new NotFoundException("Conteúdo não encontrado");

    const alreadyPurchased = await this.prisma.ppvPurchase.findUnique({
      where: { buyerId_contentId: { buyerId, contentId } },
    });
    if (alreadyPurchased) throw new BadRequestException("Conteúdo já adquirido");

    const grossAmount = content.price;
    const platformFee = Math.round(grossAmount * PLATFORM_FEE_PERCENT);
    const netAmount = grossAmount - platformFee;

    const gateway = this.selectGateway(paymentMethod.provider);
    const charge = await gateway.charge({
      amount: grossAmount,
      currency: "BRL",
      token: paymentMethod.token,
      description: `PPV: ${content.title} — Inti.mate`,
      metadata: { contentId, buyerId },
    });

    const purchase = await this.prisma.$transaction(async (tx) => {
      const p = await tx.ppvPurchase.create({
        data: { buyerId, contentId, pricePaid: grossAmount },
      });

      await tx.transaction.create({
        data: {
          userId: buyerId,
          creatorId: content.creatorId,
          type: TransactionType.PPV,
          status: charge.status === "paid" ? "PAID" : "PENDING",
          grossAmount,
          platformFee,
          netAmount,
          description: `PPV: ${content.title}`,
          ppvPurchaseId: p.id,
          gatewayProvider: paymentMethod.provider,
          gatewayTxId: charge.id,
          gatewayPayload: charge.raw,
        },
      });

      await tx.ppvContent.update({
        where: { id: contentId },
        data: { purchaseCount: { increment: 1 } },
      });

      return p;
    });

    if (charge.status === "paid") {
      await this.creditCreatorBalance(content.creatorId, netAmount);
    }

    return { purchaseId: purchase.id, contentUrl: content.contentUrl };
  }

  // ─── Webhook do gateway ──────────────────────────────────

  async handleWebhook(provider: string, payload: any, signature: string) {
    const gateway = this.selectGateway(provider as any);
    const event = await gateway.parseWebhook(payload, signature);

    switch (event.type) {
      case "payment.paid":
        await this.onPaymentPaid(event.gatewayTxId, event.raw);
        break;
      case "payment.failed":
        await this.onPaymentFailed(event.gatewayTxId, event.reason);
        break;
      case "payment.refunded":
        await this.onPaymentRefunded(event.gatewayTxId);
        break;
      case "chargeback":
        await this.onChargeback(event.gatewayTxId);
        break;
    }
  }

  private async onPaymentPaid(gatewayTxId: string, raw: any) {
    const tx = await this.prisma.transaction.findUnique({ where: { gatewayTxId } });
    if (!tx || tx.status === "PAID") return;

    await this.prisma.transaction.update({
      where: { gatewayTxId },
      data: { status: "PAID", gatewayPayload: raw },
    });

    if (tx.creatorId) {
      await this.creditCreatorBalance(tx.creatorId, tx.netAmount);
    }

    // Ativa assinatura se estava em PAST_DUE
    if (tx.subscriptionId) {
      await this.prisma.subscription.update({
        where: { id: tx.subscriptionId },
        data: { status: "ACTIVE" },
      });
    }
  }

  private async onPaymentFailed(gatewayTxId: string, reason?: string) {
    await this.prisma.transaction.updateMany({
      where: { gatewayTxId },
      data: { status: "FAILED", failureReason: reason },
    });
  }

  private async onPaymentRefunded(gatewayTxId: string) {
    const tx = await this.prisma.transaction.findUnique({ where: { gatewayTxId } });
    if (!tx) return;

    await this.prisma.transaction.update({
      where: { gatewayTxId },
      data: { status: "REFUNDED", refundedAt: new Date() },
    });

    // Debita saldo do criador no reembolso
    if (tx.creatorId && tx.status === "PAID") {
      await this.prisma.creatorBalance.update({
        where: { creatorId: tx.creatorId },
        data: {
          availableAmount: { decrement: tx.netAmount },
        },
      });
    }
  }

  private async onChargeback(gatewayTxId: string) {
    await this.prisma.transaction.updateMany({
      where: { gatewayTxId },
      data: { status: "CHARGEBACK" },
    });
    this.logger.warn(`Chargeback recebido: ${gatewayTxId}`);
  }

  // ─── Utilitários ─────────────────────────────────────────

  private async creditCreatorBalance(creatorId: string, amount: number) {
    await this.prisma.creatorBalance.upsert({
      where: { creatorId },
      create: {
        creatorId,
        availableAmount: amount,
        totalEarned: amount,
      },
      update: {
        availableAmount: { increment: amount },
        totalEarned: { increment: amount },
      },
    });
  }

  private selectGateway(provider: "pagarme" | "stripe") {
    return provider === "stripe" ? this.stripe : this.pagarme;
  }

  // ─── Extrato ─────────────────────────────────────────────

  async getTransactionHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          status: true,
          grossAmount: true,
          platformFee: true,
          netAmount: true,
          currency: true,
          description: true,
          createdAt: true,
        },
      }),
      this.prisma.transaction.count({ where: { userId } }),
    ]);

    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      // Mostra taxa de forma transparente
      platformFeePercent: PLATFORM_FEE_PERCENT * 100,
    };
  }
}
