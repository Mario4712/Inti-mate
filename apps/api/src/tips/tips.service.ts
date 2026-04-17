import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PrismaService } from "../common/database/prisma.service";

export class SendTipDto {
  @ApiProperty({ description: "ID do criador que receberá a gorjeta" })
  @IsString()
  creatorId: string;

  @ApiProperty({ description: "Valor em R$ (mínimo R$2)" })
  @Type(() => Number)
  @IsNumber()
  @Min(2)
  amount: number;

  @ApiPropertyOptional({ maxLength: 280 })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  message?: string;

  @ApiPropertyOptional({ description: "Exibir no leaderboard público?" })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: "ID do post que originou a gorjeta" })
  @IsOptional()
  @IsString()
  mediaId?: string;
}

const PLATFORM_FEE = 0.20;

@Injectable()
export class TipsService {
  constructor(private prisma: PrismaService) {}

  async sendTip(senderId: string, dto: SendTipDto) {
    const { creatorId, amount, message, isPublic = true, mediaId } = dto;

    if (senderId === creatorId) {
      throw new BadRequestException("Não é possível enviar gorjeta para si mesmo");
    }

    const creator = await this.prisma.user.findFirst({
      where: { id: creatorId, role: "CREATOR", status: "ACTIVE" },
    });
    if (!creator) throw new NotFoundException("Criador não encontrado");

    const netAmount = amount * (1 - PLATFORM_FEE);

    const tip = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tip.create({
        data: {
          senderId,
          creatorId,
          amount,
          netAmount,
          message:  message ?? null,
          isPublic,
          mediaId:  mediaId ?? null,
        },
      });

      // Crédita saldo do criador (valores em centavos)
      const netCentsBalance = Math.round(netAmount * 100);
      await tx.creatorBalance.upsert({
        where:  { creatorId },
        create: { creatorId, availableAmount: netCentsBalance, pendingAmount: 0, totalEarned: netCentsBalance },
        update: {
          availableAmount: { increment: netCentsBalance },
          totalEarned:     { increment: netCentsBalance },
        },
      });

      // Registra transação para extrato (valores em centavos)
      const grossCents = Math.round(amount * 100);
      const feeCents   = Math.round(grossCents * PLATFORM_FEE);
      const netCents   = grossCents - feeCents;
      await tx.transaction.create({
        data: {
          userId:      senderId,
          creatorId,
          type:        "TIP",
          status:      "PAID",
          grossAmount: grossCents,
          platformFee: feeCents,
          netAmount:   netCents,
          description: message ? `Gorjeta: ${message.slice(0, 100)}` : "Gorjeta",
        },
      });

      return t;
    });

    return {
      id:        tip.id,
      amount:    tip.amount,
      netAmount: tip.netAmount,
      createdAt: tip.createdAt,
    };
  }

  // ─── Leaderboard público (Item 23) ───────────────────────

  async getLeaderboard(creatorId: string, limit = 10) {
    // Apenas gorjetas marcadas como públicas (consentimento do fã)
    const result = await this.prisma.tip.groupBy({
      by:    ["senderId"],
      where: { creatorId, isPublic: true },
      _sum:  { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: limit,
    });

    const senderIds = result.map((r) => r.senderId);
    const profiles  = await this.prisma.userProfile.findMany({
      where:  { userId: { in: senderIds } },
      select: { userId: true, artisticName: true, avatarUrl: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    return result.map((r, i) => ({
      rank:        i + 1,
      totalAmount: Number(r._sum.amount ?? 0),
      user:        profileMap.get(r.senderId) ?? { userId: r.senderId, artisticName: "Apoiador Anônimo", avatarUrl: null },
    }));
  }

  async getMyTips(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tip.findMany({
        where:   { senderId: userId },
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        select: { id: true, creatorId: true, amount: true, message: true, createdAt: true },
      }),
      this.prisma.tip.count({ where: { senderId: userId } }),
    ]);
    return { items, total, pagination: { page, limit, pages: Math.ceil(total / limit) } };
  }
}
