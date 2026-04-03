import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";
import { PagarmeStrategy } from "../payments/strategies/pagarme.strategy";
import { RequestWithdrawalDto } from "./dto/withdrawal.dto";
import { addDays } from "date-fns";

// Saque liberado em D+14 (14 dias corridos)
const WITHDRAWAL_DAYS = 14;
const MIN_WITHDRAWAL_CENTS = 2000; // R$ 20,00

@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name);

  constructor(
    private prisma: PrismaService,
    private pagarme: PagarmeStrategy,
  ) {}

  async getBalance(creatorId: string) {
    const balance = await this.prisma.creatorBalance.findUnique({
      where: { creatorId },
      select: {
        availableAmount: true,
        pendingAmount: true,
        totalEarned: true,
        updatedAt: true,
      },
    });

    return {
      available: balance?.availableAmount ?? 0,
      pending:   balance?.pendingAmount   ?? 0,
      totalEarned: balance?.totalEarned   ?? 0,
      // Exibe em reais para facilitar leitura
      availableBrl: ((balance?.availableAmount ?? 0) / 100).toFixed(2),
      pendingBrl:   ((balance?.pendingAmount   ?? 0) / 100).toFixed(2),
      updatedAt: balance?.updatedAt,
    };
  }

  async requestWithdrawal(creatorId: string, dto: RequestWithdrawalDto) {
    // Verifica KYC aprovado (obrigatório para sacar)
    const kyc = await this.prisma.ageVerification.findUnique({ where: { userId: creatorId } });
    if (!kyc || kyc.status !== "APPROVED") {
      throw new BadRequestException("Verificação de identidade pendente. Complete o KYC para sacar.");
    }

    const balance = await this.prisma.creatorBalance.findUnique({ where: { creatorId } });
    if (!balance || balance.availableAmount < dto.amount) {
      throw new BadRequestException("Saldo insuficiente");
    }

    if (dto.amount < MIN_WITHDRAWAL_CENTS) {
      throw new BadRequestException(`Valor mínimo para saque: R$ ${(MIN_WITHDRAWAL_CENTS / 100).toFixed(2)}`);
    }

    // Verifica se não há saque pendente
    const pending = await this.prisma.withdrawal.findFirst({
      where: { creatorId, status: { in: ["PENDING", "PROCESSING"] } },
    });
    if (pending) {
      throw new BadRequestException("Você já possui um saque em processamento. Aguarde a conclusão.");
    }

    const scheduledDate = addDays(new Date(), WITHDRAWAL_DAYS);

    const [withdrawal] = await this.prisma.$transaction([
      this.prisma.withdrawal.create({
        data: {
          creatorId,
          amount: dto.amount,
          pixKey: this.maskPixKey(dto.pixKey, dto.pixKeyType), // mascara nos logs
          pixKeyType: dto.pixKeyType,
          scheduledDate,
        },
      }),
      // Reserva o valor (move de available para pending)
      this.prisma.creatorBalance.update({
        where: { creatorId },
        data: {
          availableAmount: { decrement: dto.amount },
          pendingAmount:   { increment: dto.amount },
        },
      }),
    ]);

    this.logger.log(`Saque solicitado: ${withdrawal.id} | criador=${creatorId} | R$${(dto.amount / 100).toFixed(2)}`);

    return {
      id: withdrawal.id,
      amount: withdrawal.amount,
      amountBrl: (withdrawal.amount / 100).toFixed(2),
      scheduledDate: withdrawal.scheduledDate,
      status: withdrawal.status,
      message: `Saque de R$${(dto.amount / 100).toFixed(2)} agendado para ${scheduledDate.toLocaleDateString("pt-BR")} (D+${WITHDRAWAL_DAYS}).`,
    };
  }

  async getWithdrawalHistory(creatorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.withdrawal.findMany({
        where: { creatorId },
        select: {
          id: true,
          amount: true,
          status: true,
          pixKeyType: true,
          scheduledDate: true,
          processedAt: true,
          failureReason: true,
          createdAt: true,
          // pixKey mascarada — NUNCA expor chave completa
        },
        skip, take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.withdrawal.count({ where: { creatorId } }),
    ]);

    return {
      items: items.map((w) => ({
        ...w,
        amountBrl: (w.amount / 100).toFixed(2),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // Processamento interno — chamado por job agendado
  async processScheduledWithdrawals() {
    const due = await this.prisma.withdrawal.findMany({
      where: {
        status: "PENDING",
        scheduledDate: { lte: new Date() },
      },
    });

    for (const w of due) {
      try {
        await this.prisma.withdrawal.update({
          where: { id: w.id },
          data: { status: "PROCESSING" },
        });

        // Transferência PIX via Pagar.me
        const transfer = await this.pagarme.createPixTransfer({
          amountCents: w.amount,
          pixKey: w.pixKey,
          pixKeyType: w.pixKeyType.toLowerCase() as any,
          description: `Saque ${w.id} - Inti.mate`,
          metadata: { withdrawalId: w.id, creatorId: w.creatorId },
        });
        this.logger.log(`[PIX] Transfer ${transfer.id} status=${transfer.status} for withdrawal ${w.id}`);

        await this.prisma.$transaction([
          this.prisma.withdrawal.update({
            where: { id: w.id },
            data: { status: "COMPLETED", processedAt: new Date() },
          }),
          this.prisma.creatorBalance.update({
            where: { creatorId: w.creatorId },
            data: { pendingAmount: { decrement: w.amount } },
          }),
        ]);
      } catch (err) {
        this.logger.error(`Falha no saque ${w.id}:`, err);
        await this.prisma.withdrawal.update({
          where: { id: w.id },
          data: {
            status: "FAILED",
            failureReason: String(err),
          },
        });
        // Devolve o valor ao saldo disponível
        await this.prisma.creatorBalance.update({
          where: { creatorId: w.creatorId },
          data: {
            availableAmount: { increment: w.amount },
            pendingAmount:   { decrement: w.amount },
          },
        });
      }
    }

    return { processed: due.length };
  }

  private maskPixKey(key: string, type: string): string {
    if (type === "CPF") return `***.***.${key.slice(-6, -2)}-**`;
    if (type === "EMAIL") {
      const [user, domain] = key.split("@");
      return `${user.slice(0, 2)}***@${domain}`;
    }
    if (type === "PHONE") return `+55 (**) *****-${key.slice(-4)}`;
    return `${key.slice(0, 4)}****${key.slice(-4)}`;
  }
}
