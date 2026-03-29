import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";

const FEATURED_LIMIT  = 8;
const NEW_CREATORS_DAYS = 30;

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Página de descoberta (Item 20) ──────────────────────

  async getDiscoveryPage(viewerId?: string) {
    const [featured, newCreators, popular] = await Promise.all([
      this.getFeatured(),
      this.getNewCreators(),
      this.getPopularCategories(),
    ]);

    const recommended = viewerId
      ? await this.getRecommendations(viewerId)
      : [];

    return { featured, newCreators, popular, recommended };
  }

  private async getFeatured() {
    // Curadoria manual: perfis marcados como featured (campo no UserProfile)
    // + fallback para os com mais assinantes ativos
    const profiles = await this.prisma.userProfile.findMany({
      where: {
        user: { role: "CREATOR", status: "ACTIVE" },
        // featured: true,  // TODO: adicionar campo featured ao schema
      },
      orderBy: [
        // { featured: "desc" },
        { user: { mySubscriptions: { _count: "desc" } } },
      ],
      take: FEATURED_LIMIT,
      select: {
        userId:       true,
        artisticName: true,
        avatarUrl:    true,
        bio:          true,
        category:     true,
        tags:         true,
        user: {
          select: {
            _count: { select: { mySubscriptions: true } },
          },
        },
      },
    });

    return profiles.map((p) => ({
      id:               p.userId,
      artisticName:     p.artisticName,
      avatarUrl:        p.avatarUrl,
      bio:              p.bio,
      category:         p.category,
      tags:             p.tags,
      subscriberCount:  p.user._count.mySubscriptions,
    }));
  }

  private async getNewCreators() {
    const since = new Date();
    since.setDate(since.getDate() - NEW_CREATORS_DAYS);

    const profiles = await this.prisma.userProfile.findMany({
      where: {
        user: {
          role:      "CREATOR",
          status:    "ACTIVE",
          createdAt: { gte: since },
        },
      },
      orderBy: { user: { createdAt: "desc" } },
      take: FEATURED_LIMIT,
      select: {
        userId:       true,
        artisticName: true,
        avatarUrl:    true,
        category:     true,
        user:         { select: { createdAt: true } },
      },
    });

    return profiles.map((p) => ({
      id:           p.userId,
      artisticName: p.artisticName,
      avatarUrl:    p.avatarUrl,
      category:     p.category,
      joinedAt:     p.user.createdAt,
    }));
  }

  private async getPopularCategories() {
    // Agrega contagem de criadores ativos por categoria
    const result = await this.prisma.userProfile.groupBy({
      by:        ["category"],
      where:     { user: { role: "CREATOR", status: "ACTIVE" }, category: { not: null } },
      _count:    { userId: true },
      orderBy:   { _count: { userId: "desc" } },
      take:      10,
    });

    return result.map((r) => ({
      category: r.category,
      count:    r._count.userId,
    }));
  }

  // ─── Recomendações v1 (Item 21) ──────────────────────────
  // Collaborative filtering básico: "quem assina os mesmos criadores que você também assina..."

  async getRecommendations(viewerId: string, limit = 10) {
    // 1. Criadores que o viewer já assina
    const mySubscriptions = await this.prisma.subscription.findMany({
      where: {
        subscriberId: viewerId,
        status:       { in: ["ACTIVE", "PAST_DUE"] },
        currentPeriodEnd: { gte: new Date() },
      },
      select: { creatorId: true },
    });

    const myCreatorIds = mySubscriptions.map((s) => s.creatorId);

    if (myCreatorIds.length === 0) {
      // Cold start: retorna os mais populares que o usuário ainda não assina
      return this.popularNotSubscribed(viewerId, limit);
    }

    // 2. Usuários que também assinam pelos menos 1 dos mesmos criadores
    const similarUsers = await this.prisma.subscription.findMany({
      where: {
        creatorId:    { in: myCreatorIds },
        subscriberId: { not: viewerId },
        status:       { in: ["ACTIVE", "PAST_DUE"] },
        currentPeriodEnd: { gte: new Date() },
      },
      select: { subscriberId: true },
      distinct: ["subscriberId"],
      take: 200, // cap para não explodir a query
    });

    const similarIds = similarUsers.map((u) => u.subscriberId);

    if (similarIds.length === 0) {
      return this.popularNotSubscribed(viewerId, limit);
    }

    // 3. Criadores que esses usuários similares assinam, que o viewer ainda não assina
    const candidateSubs = await this.prisma.subscription.findMany({
      where: {
        subscriberId: { in: similarIds },
        creatorId:    { notIn: myCreatorIds },
        status:       { in: ["ACTIVE", "PAST_DUE"] },
        currentPeriodEnd: { gte: new Date() },
      },
      select: { creatorId: true },
    });

    // 4. Rank por frequência
    const freq = new Map<string, number>();
    for (const s of candidateSubs) {
      freq.set(s.creatorId, (freq.get(s.creatorId) ?? 0) + 1);
    }

    const ranked = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    if (ranked.length === 0) {
      return this.popularNotSubscribed(viewerId, limit);
    }

    // 5. Busca perfis dos candidatos
    const profiles = await this.prisma.userProfile.findMany({
      where: { userId: { in: ranked }, user: { status: "ACTIVE" } },
      select: {
        userId:       true,
        artisticName: true,
        avatarUrl:    true,
        category:     true,
        bio:          true,
      },
    });

    // Mantém a ordem de ranking
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));
    return ranked
      .map((id) => profileMap.get(id))
      .filter(Boolean)
      .map((p) => ({
        id:           p!.userId,
        artisticName: p!.artisticName,
        avatarUrl:    p!.avatarUrl,
        category:     p!.category,
        reason:       "collaborative_filter",
      }));
  }

  private async popularNotSubscribed(viewerId: string, limit: number) {
    const myIds = (
      await this.prisma.subscription.findMany({
        where: { subscriberId: viewerId },
        select: { creatorId: true },
      })
    ).map((s) => s.creatorId);

    const profiles = await this.prisma.userProfile.findMany({
      where: {
        userId:  { notIn: [...myIds, viewerId] },
        user:    { role: "CREATOR", status: "ACTIVE" },
      },
      orderBy: { user: { mySubscriptions: { _count: "desc" } } },
      take:    limit,
      select:  {
        userId: true, artisticName: true, avatarUrl: true, category: true,
      },
    });

    return profiles.map((p) => ({
      id:           p.userId,
      artisticName: p.artisticName,
      avatarUrl:    p.avatarUrl,
      category:     p.category,
      reason:       "popular",
    }));
  }
}
