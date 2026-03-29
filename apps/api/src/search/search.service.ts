import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";
import { ElasticsearchService, CreatorDocument } from "./elasticsearch.service";
import { SearchCreatorsDto } from "./dto/search.dto";

// Categorias aprovadas pela moderação (evita categorias inapropriadas em metadados públicos)
export const APPROVED_CATEGORIES = [
  "fitness", "arte", "musica", "culinaria", "fotografia",
  "cosplay", "danca", "lifestyle", "modelo", "entretenimento", "adulto",
] as const;

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private prisma:   PrismaService,
    private esClient: ElasticsearchService,
  ) {}

  // ─── Busca ────────────────────────────────────────────────

  async searchCreators(dto: SearchCreatorsDto) {
    try {
      return await this.esClient.searchCreators({
        q:             dto.q,
        tags:          dto.tags,
        category:      dto.category,
        maxPriceCents: dto.maxPrice,
        country:       dto.country,
        page:          dto.page  ?? 1,
        limit:         dto.limit ?? 20,
      });
    } catch (err) {
      this.logger.warn("Elasticsearch indisponível, fallback para PostgreSQL:", err);
      return this.searchFallback(dto);
    }
  }

  async suggestTags(prefix: string) {
    if (!prefix || prefix.length < 2) return [];
    try {
      return await this.esClient.suggestTags(prefix);
    } catch {
      // Fallback: busca no banco
      return this.tagFallback(prefix);
    }
  }

  // ─── Indexação ────────────────────────────────────────────

  /**
   * Chamado após qualquer alteração de perfil de criador.
   * Reindexar é idempotente — pode ser chamado com frequência.
   */
  async reindexCreator(creatorId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: creatorId },
      include: {
        user: {
          include: {
            creatorPlans: {
              where: { isActive: true },
              select: { monthlyPrice: true },
              orderBy: { monthlyPrice: "asc" },
              take: 1,
            },
            mySubscriptions: {
              where: { status: { in: ["ACTIVE", "PAST_DUE"] } },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!profile || profile.user.role !== "CREATOR") return;

    const doc: CreatorDocument = {
      id:           creatorId,
      artisticName: profile.artisticName ?? profile.user.email,
      bio:          profile.bio          ?? "",
      tags:         (profile.tags as string[]) ?? [],
      category:     (profile.category as string) ?? "",
      avatarUrl:    profile.avatarUrl    ?? null,
      subscriptionPriceMin: profile.user.creatorPlans[0]
        ? Math.round(Number(profile.user.creatorPlans[0].monthlyPrice) * 100)
        : 0,
      totalSubscribers: profile.user.mySubscriptions.length,
      country: profile.country ?? "BR",
      createdAt: profile.user.createdAt.toISOString(),
    };

    await this.esClient.indexCreator(doc);
  }

  // ─── Fallbacks PostgreSQL ─────────────────────────────────

  private async searchFallback(dto: SearchCreatorsDto) {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 20;
    const skip  = (page - 1) * limit;

    const where: any = {
      user: { role: "CREATOR", status: "ACTIVE" },
    };

    if (dto.q) {
      where.OR = [
        { artisticName: { contains: dto.q, mode: "insensitive" } },
        { bio:          { contains: dto.q, mode: "insensitive" } },
      ];
    }
    if (dto.category) where.category = dto.category;
    if (dto.country)  where.country  = dto.country;

    const [profiles, total] = await this.prisma.$transaction([
      this.prisma.userProfile.findMany({
        where,
        skip,
        take: limit,
        select: {
          userId: true, artisticName: true, bio: true,
          avatarUrl: true, tags: true, category: true,
          country: true,
        },
      }),
      this.prisma.userProfile.count({ where }),
    ]);

    return {
      total,
      items: profiles.map((p) => ({
        id:           p.userId,
        artisticName: p.artisticName ?? "",
        bio:          p.bio          ?? "",
        tags:         (p.tags as string[]) ?? [],
        category:     (p.category as string) ?? "",
        avatarUrl:    p.avatarUrl    ?? null,
        subscriptionPriceMin: 0,
        totalSubscribers:     0,
        country:      p.country ?? "BR",
        createdAt:    new Date().toISOString(),
      })),
    };
  }

  private async tagFallback(prefix: string): Promise<string[]> {
    // Tags armazenadas como JSON array — não suporta busca eficiente sem ES
    this.logger.debug(`Tag fallback para prefix: ${prefix}`);
    return [];
  }
}
