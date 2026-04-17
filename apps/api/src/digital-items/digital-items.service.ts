import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  IsEnum, IsInt, IsNumber, IsOptional, IsString,
  MaxLength, Min, Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PrismaService } from "../common/database/prisma.service";
import { StorageService } from "../content/storage.service";

export enum DigitalItemTypeEnum {
  PHOTO_PACK      = "PHOTO_PACK",
  VIDEO_PACK      = "VIDEO_PACK",
  CUSTOM_REQUEST  = "CUSTOM_REQUEST",
  VOICE_MESSAGE   = "VOICE_MESSAGE",
  OTHER           = "OTHER",
}

export class CreateDigitalItemDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: DigitalItemTypeEnum })
  @IsEnum(DigitalItemTypeEnum)
  type: DigitalItemTypeEnum;

  @ApiProperty({ description: "Preço em R$", minimum: 5 })
  @IsNumber()
  @Min(5)
  price: number;

  @ApiPropertyOptional({ description: "Prazo de entrega em dias úteis", default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  deliveryDays?: number;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  buyerNote?: string;
}

const PLATFORM_FEE = 0.20;

@Injectable()
export class DigitalItemsService {
  constructor(
    private prisma:   PrismaService,
    private storage:  StorageService,
  ) {}

  // ─── Criador: gerenciar catálogo ──────────────────────────

  async createItem(creatorId: string, dto: CreateDigitalItemDto) {
    const count = await this.prisma.digitalItem.count({
      where: { creatorId, isActive: true },
    });
    if (count >= 50) throw new BadRequestException("Limite de 50 itens ativos atingido");

    return this.prisma.digitalItem.create({
      data: {
        creatorId,
        title:        dto.title,
        description:  dto.description ?? null,
        type:         dto.type as any,
        price:        dto.price,
        deliveryDays: dto.deliveryDays ?? 3,
      },
    });
  }

  async deactivateItem(creatorId: string, itemId: string) {
    const item = await this.prisma.digitalItem.findFirst({ where: { id: itemId, creatorId } });
    if (!item) throw new NotFoundException();
    return this.prisma.digitalItem.update({
      where: { id: itemId },
      data:  { isActive: false },
    });
  }

  async getCreatorCatalog(creatorId: string) {
    return this.prisma.digitalItem.findMany({
      where:   { creatorId, isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, description: true,
        type: true, price: true, deliveryDays: true, sampleUrl: true,
      },
    });
  }

  // ─── Comprador: pedidos ───────────────────────────────────

  async createOrder(buyerId: string, dto: CreateOrderDto) {
    const item = await this.prisma.digitalItem.findFirst({
      where: { id: dto.itemId, isActive: true },
    });
    if (!item) throw new NotFoundException("Item não encontrado ou indisponível");

    // KYC do comprador para pedidos CUSTOM_REQUEST (proteção extra)
    if (item.type === "CUSTOM_REQUEST") {
      const age = await this.prisma.ageVerification.findUnique({
        where: { userId: buyerId },
      });
      if (!age || age.status !== "APPROVED") {
        throw new ForbiddenException("Verificação de identidade necessária para pedidos personalizados");
      }
    }

    const price     = Number(item.price);
    const netAmount = price * (1 - PLATFORM_FEE);
    const deadline  = new Date();
    deadline.setDate(deadline.getDate() + item.deliveryDays);

    const order = await this.prisma.$transaction(async (tx) => {
      const o = await tx.digitalOrder.create({
        data: {
          buyerId,
          itemId:    item.id,
          status:    "PAID", // mock — integração real via payments
          price,
          netAmount,
          buyerNote: dto.buyerNote ?? null,
          deadlineAt: deadline,
        },
      });

      const netCents = Math.round(netAmount * 100);
      await tx.creatorBalance.upsert({
        where:  { creatorId: item.creatorId },
        create: { creatorId: item.creatorId, availableAmount: netCents, pendingAmount: 0, totalEarned: netCents },
        update: {
          availableAmount: { increment: netCents },
          totalEarned:     { increment: netCents },
        },
      });

      return o;
    });

    return {
      id:        order.id,
      status:    order.status,
      deadlineAt: order.deadlineAt,
      price:     order.price,
    };
  }

  async deliverOrder(creatorId: string, orderId: string, deliveryUrl: string) {
    const order = await this.prisma.digitalOrder.findFirst({
      where: { id: orderId, item: { creatorId } },
    });
    if (!order) throw new NotFoundException();
    if (order.status !== "PAID" && order.status !== "IN_PROGRESS") {
      throw new BadRequestException("Pedido não está em estado entregável");
    }

    return this.prisma.digitalOrder.update({
      where: { id: orderId },
      data:  { status: "DELIVERED", deliveryUrl, deliveredAt: new Date() },
    });
  }

  async getMyOrders(buyerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.digitalOrder.findMany({
        where:   { buyerId },
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        include: { item: { select: { title: true, type: true, creatorId: true } } },
      }),
      this.prisma.digitalOrder.count({ where: { buyerId } }),
    ]);
    return { items, total, pagination: { page, limit, pages: Math.ceil(total / limit) } };
  }

  async getCreatorOrders(creatorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.digitalOrder.findMany({
        where:   { item: { creatorId } },
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        include: { item: { select: { title: true, type: true } } },
      }),
      this.prisma.digitalOrder.count({ where: { item: { creatorId } } }),
    ]);
    return { items, total, pagination: { page, limit, pages: Math.ceil(total / limit) } };
  }
}
