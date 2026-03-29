import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Logger } from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";
import { StorageService } from "../content/storage.service";

const PLATFORM_FEE   = 0.20;
const MIN_BID_STEP   = 100; // centavos (R$ 1,00 mínimo por lance acima do atual)

@Injectable()
export class AuctionsService {
  private readonly logger = new Logger(AuctionsService.name);

  constructor(
    private prisma:   PrismaService,
    private storage:  StorageService,
  ) {}

  // ─── Criar leilão ─────────────────────────────────────────

  async create(
    creatorId: string,
    data: {
      title:       string;
      description?: string;
      mediaId?:    string;
      startingBid: number;    // centavos
      endsAt:      Date;
    },
  ) {
    if (data.endsAt <= new Date()) {
      throw new BadRequestException("Data de encerramento deve ser futura");
    }
    if (data.startingBid < 100) {
      throw new BadRequestException("Lance mínimo inicial deve ser de pelo menos R$ 1,00");
    }

    return this.prisma.auction.create({
      data: {
        creatorId,
        title:       data.title,
        description: data.description ?? null,
        mediaId:     data.mediaId     ?? null,
        startingBid: data.startingBid,
        currentBid:  data.startingBid,
        endsAt:      data.endsAt,
        status:      "OPEN",
      },
    });
  }

  // ─── Fazer lance ─────────────────────────────────────────

  async placeBid(auctionId: string, bidderId: string, amountCents: number) {
    const auction = await this.prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction)                    throw new NotFoundException("Leilão não encontrado");
    if (auction.status !== "OPEN")   throw new BadRequestException("Leilão não está aberto para lances");
    if (auction.endsAt <= new Date()) throw new BadRequestException("Leilão encerrado");
    if (auction.creatorId === bidderId) throw new ForbiddenException("Criadores não podem dar lances em seus próprios leilões");

    const minRequired = auction.currentBid + MIN_BID_STEP;
    if (amountCents < minRequired) {
      throw new BadRequestException(
        `Lance mínimo é R$ ${(minRequired / 100).toFixed(2)} (R$ ${(MIN_BID_STEP / 100).toFixed(2)} acima do atual)`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.auctionBid.create({
        data: { auctionId, bidderId, amount: amountCents },
      }),
      this.prisma.auction.update({
        where: { id: auctionId },
        data:  { currentBid: amountCents, winnerId: bidderId },
      }),
    ]);

    return {
      auctionId,
      currentBid: amountCents,
      endsAt:     auction.endsAt,
    };
  }

  // ─── Detalhes + histórico de lances ──────────────────────

  async getAuction(auctionId: string) {
    const auction = await this.prisma.auction.findUnique({
      where:   { id: auctionId },
      include: {
        bids: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, bidderId: true, amount: true, createdAt: true },
        },
      },
    });
    if (!auction) throw new NotFoundException();
    return auction;
  }

  async listByCreator(creatorId: string) {
    return this.prisma.auction.findMany({
      where:   { creatorId },
      orderBy: { createdAt: "desc" },
      select:  { id: true, title: true, status: true, currentBid: true, endsAt: true, winnerId: true },
    });
  }

  // ─── Fechar leilões expirados automaticamente ─────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async closeExpiredAuctions() {
    const expired = await this.prisma.auction.findMany({
      where: { status: "OPEN", endsAt: { lte: new Date() } },
    });

    for (const auction of expired) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.auction.update({
            where: { id: auction.id },
            data:  { status: "CLOSED" },
          });

          if (!auction.winnerId) return; // sem lances, cancela

          // Cobrar vencedor (TODO: integrar com payments gateway)
          const netCents = Math.round(auction.currentBid * (1 - PLATFORM_FEE));

          await tx.creatorBalance.upsert({
            where:  { creatorId: auction.creatorId },
            create: { creatorId: auction.creatorId, availableAmount: netCents, pendingAmount: 0, totalEarned: netCents },
            update: { availableAmount: { increment: netCents }, totalEarned: { increment: netCents } },
          });

          await tx.auction.update({
            where: { id: auction.id },
            data:  { status: "PAID" },
          });
        });

        this.logger.log(`Leilão ${auction.id} encerrado. Vencedor: ${auction.winnerId ?? "nenhum"}`);
      } catch (err) {
        this.logger.error(`Erro ao fechar leilão ${auction.id}:`, err);
      }
    }
  }

  // ─── Entregar conteúdo ao vencedor ───────────────────────

  async deliverToWinner(creatorId: string, auctionId: string, mediaKey: string) {
    const auction = await this.prisma.auction.findFirst({
      where: { id: auctionId, creatorId, status: "PAID" },
    });
    if (!auction)         throw new NotFoundException("Leilão não encontrado ou ainda não pago");
    if (!auction.winnerId) throw new BadRequestException("Leilão sem vencedor");

    // Gera URL pré-assinada válida por 72h para o vencedor
    const signedUrl = await this.storage.getSignedUrl(mediaKey, 72 * 3600);

    await this.prisma.auction.update({
      where: { id: auctionId },
      data:  { deliveryUrl: signedUrl, deliveredAt: new Date() },
    });

    return { deliveryUrl: signedUrl, deliveredAt: new Date() };
  }
}
