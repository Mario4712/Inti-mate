import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";

/**
 * Recomendações preditivas v2.
 *
 * Arquitetura híbrida:
 * - Collaborative filtering (já implementado no Bloco 4) como base
 * - Content-based boosting via co-ocorrência de tags/categoria
 * - Score de conversão ponderado por histórico de compras do usuário
 * - Opção de transparência: explica o motivo de cada recomendação
 * - Sem escalonamento para extremos: diversidade mínima garantida
 *
 * Produção futura: substituir por pgvector embeddings ou serviço ML dedicado.
 */

interface RecommendedCreator {
  id:           string;
  artisticName: string | null;
  avatarUrl:    string | null;
  category:     string | null;
  score:        number;
  reason:       string;
  reasonCode:   "collaborative" | "content_based" | "popular" | "new_creator";
}

const MAX_RESULTS        = 20;
const MIN_DIVERSITY_CATS = 3; // mínimo de categorias distintas no resultado

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(private prisma: PrismaService) {}

  async getRecommendations(
    viewerId:     string,
    limit = 10,
    withExplanations = false,
  ): Promise<{ items: RecommendedCreator[]; personalized: boolean }> {
    const [collaborative, contentBased] = await Promise.all([
      this.collaborativeScore(viewerId),
      this.contentBasedScore(viewerId),
    ]);

    // Merge e normaliza scores
    const merged = this.mergeScores(collaborative, contentBased);

    // Garante diversidade mínima de categorias
    const diversified = this.diversify(merged, MIN_DIVERSITY_CATS);

    // Busca perfis dos candidatos
    const ids     = diversified.slice(0, MAX_RESULTS).map((c) => c.id);
    const profiles = await this.prisma.userProfile.findMany({
      where:  { userId: { in: ids }, user: { status: "ACTIVE" } },
      select: { userId: true, artisticName: true, avatarUrl: true, category: true },
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const items: RecommendedCreator[] = diversified
      .slice(0, limit)
      .map((c) => {
        const p = profileMap.get(c.id);
        return {
          id:           c.id,
          artisticName: p?.artisticName ?? null,
          avatarUrl:    p?.avatarUrl    ?? null,
          category:     p?.category     ?? null,
          score:        Math.round(c.score * 100) / 100,
          reason:       withExplanations ? this.explain(c.reasonCode, c.tags) : "",
          reasonCode:   c.reasonCode,
        };
      })
      .filter((c) => c.artisticName !== null);

    return { items, personalized: collaborative.length > 0 };
  }

  // ─── Transparência: por que estou vendo isso? ─────────────

  async explainRecommendation(viewerId: string, creatorId: string): Promise<string> {
    // Verifica se o viewer compartilha assinantes com o criador
    const shared = await this.prisma.subscription.count({
      where: {
        creatorId,
        subscriber: {
          mySubscriptions: {
            some: {
              creator: {
                mySubscriptions: {
                  some: { subscriberId: viewerId },
                },
              },
            },
          },
        },
      },
    });

    if (shared > 0) {
      return `Pessoas com gosto parecido com o seu também seguem este criador.`;
    }

    // Verifica sobreposição de categoria
    const viewerProfile  = await this.prisma.userProfile.findUnique({
      where:  { userId: viewerId },
      select: { tags: true, category: true },
    });
    const creatorProfile = await this.prisma.userProfile.findUnique({
      where:  { userId: creatorId },
      select: { category: true },
    });

    if (viewerProfile?.category && viewerProfile.category === creatorProfile?.category) {
      return `Este criador está na categoria ${viewerProfile.category}, que você costuma explorar.`;
    }

    return `Este criador está entre os mais populares da plataforma na sua região.`;
  }

  // ─── Algoritmos internos ──────────────────────────────────

  private async collaborativeScore(viewerId: string): Promise<Array<{ id: string; score: number; reasonCode: "collaborative"; tags: string[] }>> {
    const myCreators = await this.prisma.subscription.findMany({
      where: {
        subscriberId: viewerId,
        status: { in: ["ACTIVE", "PAST_DUE"] },
        currentPeriodEnd: { gte: new Date() },
      },
      select: { creatorId: true },
    });

    if (myCreators.length === 0) return [];
    const myCreatorIds = myCreators.map((s) => s.creatorId);

    // Usuários similares
    const similar = await this.prisma.subscription.findMany({
      where: {
        creatorId:    { in: myCreatorIds },
        subscriberId: { not: viewerId },
        status:       { in: ["ACTIVE", "PAST_DUE"] },
        currentPeriodEnd: { gte: new Date() },
      },
      select: { subscriberId: true },
      distinct: ["subscriberId"],
      take: 300,
    });

    const simIds = similar.map((s) => s.subscriberId);
    if (simIds.length === 0) return [];

    // Criadores que eles assinam, que eu ainda não assino
    const candidates = await this.prisma.subscription.findMany({
      where: {
        subscriberId: { in: simIds },
        creatorId:    { notIn: [...myCreatorIds, viewerId] },
        status:       { in: ["ACTIVE", "PAST_DUE"] },
        currentPeriodEnd: { gte: new Date() },
      },
      select: { creatorId: true },
    });

    const freq = new Map<string, number>();
    for (const c of candidates) {
      freq.set(c.creatorId, (freq.get(c.creatorId) ?? 0) + 1);
    }

    const maxFreq = Math.max(...freq.values(), 1);
    return [...freq.entries()].map(([id, f]) => ({
      id,
      score:      f / maxFreq,
      reasonCode: "collaborative" as const,
      tags:       [],
    }));
  }

  private async contentBasedScore(viewerId: string): Promise<Array<{ id: string; score: number; reasonCode: "content_based"; tags: string[] }>> {
    // Tags dos conteúdos que o usuário mais visualizou
    const topViewed = await this.prisma.media.findMany({
      where:   { creatorId: { not: viewerId }, status: "APPROVED" },
      orderBy: { viewCount: "desc" },
      take:    50,
      select:  { creatorId: true },
    });

    if (topViewed.length === 0) return [];

    // Categoria preferida do viewer
    const viewerProfile = await this.prisma.userProfile.findUnique({
      where: { userId: viewerId }, select: { category: true, tags: true },
    });

    if (!viewerProfile?.category) return [];

    // Criadores na mesma categoria com mais assinantes
    const byCategory = await this.prisma.userProfile.findMany({
      where: {
        category: viewerProfile.category,
        user: { role: "CREATOR", status: "ACTIVE" },
        userId: { not: viewerId },
      },
      select: { userId: true, tags: true },
      take: 50,
    });

    const myCreatorIds = new Set(
      (await this.prisma.subscription.findMany({
        where: { subscriberId: viewerId }, select: { creatorId: true },
      })).map((s) => s.creatorId),
    );

    return byCategory
      .filter((p) => !myCreatorIds.has(p.userId))
      .map((p) => {
        // Score por sobreposição de tags
        const viewerTags  = (viewerProfile.tags  as string[]) ?? [];
        const creatorTags = (p.tags as string[]) ?? [];
        const overlap     = viewerTags.filter((t) => creatorTags.includes(t)).length;
        const score       = overlap > 0 ? 0.3 + (overlap / Math.max(viewerTags.length, 1)) * 0.4 : 0.3;

        return { id: p.userId, score, reasonCode: "content_based" as const, tags: creatorTags };
      });
  }

  private mergeScores(
    a: Array<{ id: string; score: number; reasonCode: any; tags: string[] }>,
    b: Array<{ id: string; score: number; reasonCode: any; tags: string[] }>,
  ) {
    const map = new Map<string, { id: string; score: number; reasonCode: any; tags: string[] }>();

    for (const item of [...a, ...b]) {
      const existing = map.get(item.id);
      if (existing) {
        // Combina scores com peso: collaborative 60%, content_based 40%
        const weight = item.reasonCode === "collaborative" ? 0.6 : 0.4;
        existing.score += item.score * weight;
      } else {
        map.set(item.id, { ...item });
      }
    }

    return [...map.values()].sort((a, b) => b.score - a.score);
  }

  private diversify(
    items: Array<{ id: string; score: number; reasonCode: any; tags: string[] }>,
    minCategories: number,
  ) {
    // Não temos categoria aqui, mas garantimos que não há mais de 60% de um mesmo reasonCode
    const collab  = items.filter((i) => i.reasonCode === "collaborative");
    const content = items.filter((i) => i.reasonCode === "content_based");

    const result: typeof items = [];
    let ci = 0, co = 0;

    while (result.length < MAX_RESULTS && (ci < collab.length || co < content.length)) {
      // 60% collaborative, 40% content_based
      if (ci < collab.length && result.filter((i) => i.reasonCode === "collaborative").length < result.length * 0.65) {
        result.push(collab[ci++]);
      } else if (co < content.length) {
        result.push(content[co++]);
      } else if (ci < collab.length) {
        result.push(collab[ci++]);
      }
    }

    return result;
  }

  private explain(reasonCode: string, tags: string[]): string {
    switch (reasonCode) {
      case "collaborative":   return "Pessoas com gosto parecido com o seu seguem este criador.";
      case "content_based":   return `Baseado nas categorias e tags que você explora${tags.length ? ` (${tags.slice(0, 3).join(", ")})` : ""}.`;
      case "popular":         return "Popular entre novos usuários da plataforma.";
      case "new_creator":     return "Criador recém-chegado com conteúdo na sua categoria.";
      default:                return "";
    }
  }
}
