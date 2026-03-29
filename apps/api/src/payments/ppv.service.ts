import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";
import { PaymentsService } from "./payments.service";
import { CreatePpvDto, PurchasePpvDto } from "./dto/ppv.dto";

@Injectable()
export class PpvService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
  ) {}

  async create(creatorId: string, dto: CreatePpvDto) {
    return this.prisma.ppvContent.create({
      data: { ...dto, creatorId, status: "PENDING_REVIEW" },
      select: {
        id: true, title: true, description: true,
        price: true, status: true, createdAt: true,
      },
    });
  }

  async listByCreator(creatorId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.ppvContent.findMany({
        where: { creatorId, status: "APPROVED" },
        select: {
          id: true, title: true, description: true,
          price: true, previewUrl: true, purchaseCount: true, createdAt: true,
          // contentUrl NUNCA exposto na listagem
        },
        skip, take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.ppvContent.count({ where: { creatorId, status: "APPROVED" } }),
    ]);

    return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getOne(contentId: string, userId: string) {
    const content = await this.prisma.ppvContent.findUnique({
      where: { id: contentId, status: "APPROVED" },
      select: {
        id: true, title: true, description: true,
        price: true, previewUrl: true, purchaseCount: true,
        creatorId: true,
      },
    });
    if (!content) throw new NotFoundException("Conteúdo não encontrado");

    const purchased = await this.prisma.ppvPurchase.findUnique({
      where: { buyerId_contentId: { buyerId: userId, contentId } },
    });

    // Só expõe contentUrl se já comprou
    if (purchased) {
      const full = await this.prisma.ppvContent.findUnique({
        where: { id: contentId },
        select: { contentUrl: true },
      });
      return { ...content, contentUrl: full?.contentUrl, purchased: true };
    }

    return { ...content, purchased: false };
  }

  async purchase(buyerId: string, contentId: string, dto: PurchasePpvDto) {
    const content = await this.prisma.ppvContent.findUnique({
      where: { id: contentId },
    });
    if (!content) throw new NotFoundException();
    if (content.creatorId === buyerId) throw new ForbiddenException("Você não pode comprar seu próprio conteúdo");

    return this.paymentsService.purchasePpv(buyerId, contentId, {
      provider: dto.provider,
      token: dto.paymentToken,
    });
  }

  async myPurchases(userId: string) {
    return this.prisma.ppvPurchase.findMany({
      where: { buyerId: userId },
      include: {
        content: {
          select: { id: true, title: true, previewUrl: true, contentUrl: true, creatorId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
