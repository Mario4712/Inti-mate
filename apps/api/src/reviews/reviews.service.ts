import {
  BadRequestException, ForbiddenException, Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async upsert(fanId: string, creatorId: string, rating: number, body?: string) {
    if (fanId === creatorId) {
      throw new ForbiddenException("Você não pode avaliar seu próprio perfil.");
    }
    if (rating < 1 || rating > 5) {
      throw new BadRequestException("Rating deve ser entre 1 e 5.");
    }

    // Only active subscribers can review
    const sub = await this.prisma.subscription.findFirst({
      where: { subscriberId: fanId, creatorId, status: "ACTIVE" },
    });
    if (!sub) {
      throw new ForbiddenException("Apenas assinantes ativos podem avaliar criadores.");
    }

    return this.prisma.review.upsert({
      where:  { fanId_creatorId: { fanId, creatorId } },
      create: { fanId, creatorId, rating, body },
      update: { rating, body, updatedAt: new Date() },
      select: { id: true, rating: true, body: true, createdAt: true },
    });
  }

  async listByCreator(creatorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total, agg] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where:   { creatorId, hidden: false },
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        select: {
          id: true, rating: true, body: true, createdAt: true,
          fan: { select: { username: true, profile: { select: { artisticName: true, avatarUrl: true } } } },
        },
      }),
      this.prisma.review.count({ where: { creatorId, hidden: false } }),
      this.prisma.review.aggregate({
        where: { creatorId, hidden: false },
        _avg:  { rating: true },
        _count: true,
      }),
    ]);

    return {
      items,
      total,
      avgRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
      pagination: { page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getMyReview(fanId: string, creatorId: string) {
    return this.prisma.review.findUnique({
      where:  { fanId_creatorId: { fanId, creatorId } },
      select: { id: true, rating: true, body: true, createdAt: true },
    });
  }

  async delete(fanId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException("Avaliação não encontrada.");
    if (review.fanId !== fanId) throw new ForbiddenException("Você não pode excluir esta avaliação.");
    await this.prisma.review.delete({ where: { id: reviewId } });
    return { deleted: true };
  }

  async hide(reviewId: string) {
    await this.prisma.review.update({ where: { id: reviewId }, data: { hidden: true } });
    return { hidden: true };
  }
}
