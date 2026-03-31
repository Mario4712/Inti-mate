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
 * Item 43 — Pagamentos cripto com KYC escalonado
 *
 * Moedas aceitas: BTC, USDC, USDT
 * NÃO aceito: Monero (rastreabilidade obrigatória por compliance)
 *
 * Tiers de KYC:
 * - LOW:  transações < R$ 2.000/mês → email + carteira (já tem na conta)
 * - HIGH: >= R$ 2.000/mês → KYC DOCUMENT APPROVED obrigatório
 *
 * Integração: Coinbase Commerce (prod) ou BTCPay Server (self-hosted)
 * — ambos via webhook + polling. Implementação atual é stub pronto para
 * substituição pelo SDK oficial.
 *
 * Expiração: 30 minutos para BTC, 15 minutos para USDC/USDT
 */

const ALLOWED_CURRENCIES = ["BTC", "USDC", "USDT"] as const;
type CryptoCurrency = (typeof ALLOWED_CURRENCIES)[number];

const KYC_THRESHOLD_BRL   = 2000;  // R$ 2.000/mês
const EXPIRY_MINUTES: Record<CryptoCurrency, number> = {
  BTC:  30,
  USDC: 15,
  USDT: 15,
};

// Taxa de câmbio mock — substituir por CoinGecko/Binance API em produção
const MOCK_RATES: Record<CryptoCurrency, number> = {
  BTC:  320_000, // R$ 320.000 / BTC
  USDC: 5.20,    // R$ 5,20 / USDC
  USDT: 5.20,    // R$ 5,20 / USDT
};

@Injectable()
export class CryptoPaymentsService {
  private readonly logger = new Logger(CryptoPaymentsService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Criar cobrança ──────────────────────────────────────

  async createCharge(
    userId:    string,
    amountBRL: number,
    currency:  string,
  ) {
    if (!ALLOWED_CURRENCIES.includes(currency as CryptoCurrency)) {
      throw new BadRequestException(`Moeda não aceita. Use: ${ALLOWED_CURRENCIES.join(", ")}`);
    }
    if (amountBRL < 10) {
      throw new BadRequestException("Valor mínimo: R$ 10,00");
    }

    const curr = currency as CryptoCurrency;

    // Verifica tier de KYC
    const kycTier = await this.resolveKycTier(userId, amountBRL);

    // Taxa de câmbio (stub — substituir por API em prod)
    const rate        = MOCK_RATES[curr];
    const amountCrypto = amountBRL / rate;

    const expiresAt = new Date(
      Date.now() + EXPIRY_MINUTES[curr] * 60_000,
    );

    // Endereço de carteira mock (substituir por API do provedor em prod)
    const walletAddress = this.generateMockWalletAddress(curr);

    // Stub: em prod criar charge via Coinbase Commerce SDK:
    // const charge = await coinbaseClient.charges.create({ name, amount, currency })
    const providerRef = `MOCK-${Date.now()}`;

    const tx = await this.prisma.cryptoTransaction.create({
      data: {
        userId,
        currency:     curr,
        amountCrypto: amountCrypto,
        amountBRL:    amountBRL,
        exchangeRate: rate,
        walletAddress,
        providerRef,
        kycTier,
        expiresAt,
        status: "PENDING",
      },
    });

    return {
      transactionId: tx.id,
      currency:      curr,
      amountCrypto:  amountCrypto.toFixed(8),
      amountBRL,
      exchangeRate:  rate,
      walletAddress,
      expiresAt,
      kycTier,
      // Em prod: retornar URL da página de pagamento do Coinbase Commerce
      paymentUrl:    `https://pay.inti.mate/crypto/${tx.id}`,
    };
  }

  // ─── Webhook / confirmação ───────────────────────────────

  /**
   * Chamado pelo webhook do provedor (Coinbase Commerce / BTCPay).
   * Valida assinatura HMAC em prod — stub aqui.
   */
  async confirmCharge(providerRef: string, status: "CONFIRMED" | "FAILED") {
    const tx = await this.prisma.cryptoTransaction.findFirst({
      where: { providerRef },
    });
    if (!tx) throw new NotFoundException("Transação não encontrada");
    if (tx.status === "CONFIRMED" || tx.status === "FAILED") {
      return { ok: true, status: tx.status }; // idempotente
    }

    if (status === "CONFIRMED") {
      await this.prisma.$transaction([
        this.prisma.cryptoTransaction.update({
          where: { id: tx.id },
          data:  { status: "CONFIRMED", confirmedAt: new Date() },
        }),
        // Credita o saldo do usuário (como consumidor)
        this.prisma.transaction.create({
          data: {
            userId:       tx.userId,
            type:         "TIP",
            grossAmount:  Math.round(Number(tx.amountBRL) * 100),
            platformFee:  0,
            netAmount:    Math.round(Number(tx.amountBRL) * 100),
            currency:     "BRL",
            status:       "PAID",
            description:  `Depósito cripto ${tx.currency} — ref ${providerRef}`,
          },
        }),
      ]);
      this.logger.log(`Crypto confirmed: ${tx.id} (${tx.currency} R$${tx.amountBRL})`);
    } else {
      await this.prisma.cryptoTransaction.update({
        where: { id: tx.id },
        data:  { status: "FAILED" },
      });
    }

    return { ok: true, status };
  }

  // ─── Consultas ───────────────────────────────────────────

  async getHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.cryptoTransaction.findMany({
        where:   { userId },
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        select: {
          id: true, currency: true, amountCrypto: true,
          amountBRL: true, exchangeRate: true, status: true,
          walletAddress: true, kycTier: true,
          confirmedAt: true, expiresAt: true, createdAt: true,
        },
      }),
      this.prisma.cryptoTransaction.count({ where: { userId } }),
    ]);

    return { items, total, pagination: { page, limit, pages: Math.ceil(total / limit) } };
  }

  async getTransaction(userId: string, txId: string) {
    const tx = await this.prisma.cryptoTransaction.findUnique({ where: { id: txId } });
    if (!tx || tx.userId !== userId) throw new NotFoundException();
    return tx;
  }

  // ─── Expiração automática ─────────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async expireStaleCharges() {
    const expired = await this.prisma.cryptoTransaction.updateMany({
      where:  { status: "PENDING", expiresAt: { lte: new Date() } },
      data:   { status: "EXPIRED" },
    });
    if (expired.count > 0) {
      this.logger.log(`Expired ${expired.count} crypto charges`);
    }
  }

  // ─── Helpers privados ────────────────────────────────────

  private async resolveKycTier(userId: string, amountBRL: number): Promise<"LOW" | "HIGH"> {
    // Volume mensal acumulado
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyVolume = await this.prisma.cryptoTransaction.aggregate({
      where: { userId, status: "CONFIRMED", createdAt: { gte: monthStart } },
      _sum:  { amountBRL: true },
    });

    const totalBRL = Number(monthlyVolume._sum.amountBRL ?? 0) + amountBRL;

    if (totalBRL >= KYC_THRESHOLD_BRL) {
      // Exige KYC completo
      const kyc = await this.prisma.ageVerification.findFirst({
        where: { userId, status: "APPROVED", type: "DOCUMENT" },
      });
      if (!kyc) {
        throw new ForbiddenException(
          `Transações acima de R$ ${KYC_THRESHOLD_BRL}/mês exigem verificação KYC completa (DOCUMENT)`,
        );
      }
      return "HIGH";
    }

    return "LOW";
  }

  private generateMockWalletAddress(currency: CryptoCurrency): string {
    // Endereços mock — em prod receber do provedor
    const prefix: Record<CryptoCurrency, string> = {
      BTC:  "bc1q",
      USDC: "0x",
      USDT: "T",
    };
    const rand = Math.random().toString(36).substring(2, 12);
    return `${prefix[currency]}${rand}mock`;
  }
}
