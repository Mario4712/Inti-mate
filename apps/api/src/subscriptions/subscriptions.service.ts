import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";
import { PaymentsService } from "../payments/payments.service";
import { CreatePlanDto } from "./dto/subscription.dto";

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
  ) {}

  // ─── Planos de assinatura ────────────────────────────────

  async createPlan(creatorId: string, dto: CreatePlanDto) {
    // Máximo de 3 planos por criador
    const count = await this.prisma.creatorPlan.count({ where: { creatorId, isActive: true } });
    if (count >= 3) throw new BadRequestException("Máximo de 3 planos por criador");

    return this.prisma.creatorPlan.create({
      data: { ...dto, creatorId },
    });
  }

  async updatePlan(creatorId: string, planId: string, dto: Partial<CreatePlanDto>) {
    const plan = await this.prisma.creatorPlan.findFirst({ where: { id: planId, creatorId } });
    if (!plan) throw new NotFoundException("Plano não encontrado");

    return this.prisma.creatorPlan.update({
      where: { id: planId },
      data: dto,
    });
  }

  async deactivatePlan(creatorId: string, planId: string) {
    const plan = await this.prisma.creatorPlan.findFirst({ where: { id: planId, creatorId } });
    if (!plan) throw new NotFoundException("Plano não encontrado");

    // Cancelar assinaturas ativas neste plano
    await this.prisma.subscription.updateMany({
      where: { planId, status: "ACTIVE" },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: "Plano desativado pelo criador" },
    });

    return this.prisma.creatorPlan.update({
      where: { id: planId },
      data: { isActive: false },
    });
  }

  async getCreatorPlans(creatorId: string) {
    return this.prisma.creatorPlan.findMany({
      where: { creatorId, isActive: true },
      orderBy: { priceMonthly: "asc" },
    });
  }

  // ─── Assinaturas ─────────────────────────────────────────

  async subscribe(
    subscriberId: string,
    planId: string,
    provider: "pagarme" | "stripe",
    paymentToken: string,
  ) {
    // Não pode se assinar a si mesmo
    const plan = await this.prisma.creatorPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException("Plano não encontrado");
    if (plan.creatorId === subscriberId) throw new ForbiddenException("Você não pode se assinar");

    return this.paymentsService.createSubscription(subscriberId, planId, {
      provider,
      token: paymentToken,
    });
  }

  async cancelSubscription(subscriberId: string, subscriptionId: string, reason?: string) {
    return this.paymentsService.cancelSubscription(subscriberId, subscriptionId, reason);
  }

  async getMySubscriptions(subscriberId: string) {
    return this.prisma.subscription.findMany({
      where: { subscriberId, status: { in: ["ACTIVE", "PAST_DUE"] } },
      include: {
        plan: {
          select: { name: true, priceMonthly: true, creatorId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getCreatorSubscribers(creatorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where: { creatorId, status: "ACTIVE" },
        select: {
          id: true,
          status: true,
          interval: true,
          currentPeriodEnd: true,
          plan: { select: { name: true } },
          // Nunca expor dados pessoais do assinante ao criador
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.subscription.count({ where: { creatorId, status: "ACTIVE" } }),
    ]);

    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async checkAccess(subscriberId: string, creatorId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        subscriberId,
        creatorId,
        status: { in: ["ACTIVE", "PAST_DUE"] },
        currentPeriodEnd: { gte: new Date() },
      },
    });
    return !!sub;
  }
}
