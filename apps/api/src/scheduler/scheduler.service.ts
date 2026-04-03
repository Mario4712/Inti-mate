import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../common/database/prisma.service";

export type Platform = "INSTAGRAM" | "TWITTER_X" | "TIKTOK";

const MAX_CAPTION_LENGTH: Record<Platform, number> = {
  INSTAGRAM: 2200,
  TWITTER_X: 280,
  TIKTOK:    2200,
};

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma:  PrismaService,
    private config:  ConfigService,
  ) {}

  // ─── Agendar post ─────────────────────────────────────────

  async schedulePost(
    creatorId: string,
    data: {
      platform:    Platform;
      caption:     string;
      mediaUrl?:   string;
      scheduledAt: Date;
    },
  ) {
    const maxLen = MAX_CAPTION_LENGTH[data.platform];
    if (data.caption.length > maxLen) {
      throw new BadRequestException(
        `Legenda muito longa para ${data.platform} (máx ${maxLen} caracteres)`,
      );
    }

    if (data.scheduledAt <= new Date()) {
      throw new BadRequestException("Horário de publicação deve ser futuro");
    }

    return this.prisma.scheduledPost.create({
      data: {
        creatorId,
        platform:    data.platform,
        caption:     data.caption,
        mediaUrl:    data.mediaUrl ?? null,
        scheduledAt: data.scheduledAt,
        status:      "SCHEDULED",
      },
    });
  }

  async cancelPost(creatorId: string, postId: string) {
    const post = await this.prisma.scheduledPost.findFirst({
      where: { id: postId, creatorId, status: "SCHEDULED" },
    });
    if (!post) throw new NotFoundException("Post não encontrado ou já publicado");

    return this.prisma.scheduledPost.update({
      where: { id: postId },
      data:  { status: "CANCELLED" },
    });
  }

  async listPosts(creatorId: string) {
    return this.prisma.scheduledPost.findMany({
      where:   { creatorId },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true, platform: true, caption: true, scheduledAt: true,
        publishedAt: true, status: true, clicks: true, conversions: true,
      },
    });
  }

  // ─── Sugestão de horário de pico ─────────────────────────
  // Baseada no horário de maior atividade dos assinantes do criador

  async suggestBestTimes(creatorId: string): Promise<Array<{ platform: Platform; suggestedAt: Date; reason: string }>> {
    // Busca horários de pico dos assinantes (reutiliza lógica de analytics)
    const result = await this.prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
      SELECT EXTRACT(HOUR FROM s."createdAt") AS hour, COUNT(*) AS count
      FROM "Subscription" s
      WHERE s."creatorId" = ${creatorId}
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 3
    `;

    const topHours = result.map((r) => Number(r.hour));
    const now = new Date();

    // Sugere o próximo dia em que cada hora de pico ocorre
    const suggestions = topHours.flatMap<{ platform: Platform; suggestedAt: Date; reason: string }>(
      (hour, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        d.setHours(hour, 0, 0, 0);

        const platforms: Platform[] = ["INSTAGRAM", "TWITTER_X", "TIKTOK"];
        return platforms.slice(0, i === 0 ? 3 : 1).map((p) => ({
          platform:    p,
          suggestedAt: new Date(d),
          reason:      `Pico de atividade dos seus assinantes às ${hour}h`,
        }));
      },
    );

    return suggestions.slice(0, 5);
  }

  // ─── Registrar clique em link rastreado ───────────────────

  async trackClick(postId: string) {
    await this.prisma.scheduledPost.updateMany({
      where: { id: postId, status: "PUBLISHED" },
      data:  { clicks: { increment: 1 } },
    });
  }

  async trackConversion(postId: string) {
    await this.prisma.scheduledPost.updateMany({
      where: { id: postId, status: "PUBLISHED" },
      data:  { conversions: { increment: 1 } },
    });
  }

  // ─── Relatório de performance ─────────────────────────────

  async getReport(creatorId: string) {
    const posts = await this.prisma.scheduledPost.findMany({
      where:   { creatorId, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take:    50,
      select:  { id: true, platform: true, publishedAt: true, clicks: true, conversions: true, caption: true },
    });

    const byPlatform = (["INSTAGRAM", "TWITTER_X", "TIKTOK"] as Platform[]).map((p) => {
      const platformPosts = posts.filter((post) => post.platform === p);
      return {
        platform:       p,
        totalPosts:     platformPosts.length,
        totalClicks:    platformPosts.reduce((sum, post) => sum + post.clicks, 0),
        totalConversions: platformPosts.reduce((sum, post) => sum + post.conversions, 0),
      };
    });

    return { posts, byPlatform };
  }

  // ─── Publicar posts agendados (@Cron) ─────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async publishDue() {
    const due = await this.prisma.scheduledPost.findMany({
      where: {
        status:      "SCHEDULED",
        scheduledAt: { lte: new Date() },
      },
      take: 50,
    });

    for (const post of due) {
      try {
        const externalId = await this.publishToNetwork(post);

        await this.prisma.scheduledPost.update({
          where: { id: post.id },
          data:  { status: "PUBLISHED", publishedAt: new Date(), externalId },
        });

        this.logger.log(`Post ${post.id} publicado em ${post.platform}`);
      } catch (err: any) {
        await this.prisma.scheduledPost.update({
          where: { id: post.id },
          data:  { status: "FAILED", errorMsg: err.message?.slice(0, 500) ?? "Erro desconhecido" },
        });
        this.logger.error(`Falha ao publicar ${post.id} em ${post.platform}:`, err);
      }
    }
  }

  // ─── Integração com APIs externas (stub) ─────────────────

  private async publishToNetwork(post: {
    id: string;
    platform: string;
    caption: string;
    mediaUrl: string | null;
    creatorId?: string;
  }): Promise<string> {
    switch (post.platform) {
      case "INSTAGRAM":
        return this.publishToInstagram(post);
      case "TWITTER_X":
        return this.publishToTwitter(post);
      case "TIKTOK":
        return this.publishToTikTok(post);
      default:
        throw new Error(`Plataforma ${post.platform} não suportada`);
    }
  }

  /**
   * Instagram Graph API — Container-based publishing
   * Requires: page access token with instagram_content_publish permission
   */
  private async publishToInstagram(post: { caption: string; mediaUrl: string | null }): Promise<string> {
    const accessToken = this.config.get("app.social.instagram.accessToken");
    const igUserId = this.config.get("app.social.instagram.userId");

    if (!accessToken || !igUserId) {
      this.logger.warn("[MOCK] Instagram: tokens não configurados");
      return `mock-instagram-${Date.now()}`;
    }

    // Step 1: Create media container
    const containerParams = new URLSearchParams({
      caption: post.caption,
      access_token: accessToken,
    });
    if (post.mediaUrl) containerParams.set("image_url", post.mediaUrl);

    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media?${containerParams}`,
      { method: "POST" },
    );
    const container: any = await containerRes.json();
    if (container.error) throw new Error(`Instagram: ${container.error.message}`);

    // Step 2: Publish container
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media_publish?creation_id=${container.id}&access_token=${accessToken}`,
      { method: "POST" },
    );
    const published: any = await publishRes.json();
    if (published.error) throw new Error(`Instagram publish: ${published.error.message}`);

    return published.id;
  }

  /**
   * Twitter/X API v2 — Tweet creation
   * Requires: OAuth 2.0 Bearer Token with tweet.write scope
   */
  private async publishToTwitter(post: { caption: string; mediaUrl: string | null }): Promise<string> {
    const bearerToken = this.config.get("app.social.twitter.bearerToken");

    if (!bearerToken) {
      this.logger.warn("[MOCK] Twitter/X: token não configurado");
      return `mock-twitter-${Date.now()}`;
    }

    const body: any = { text: post.caption };

    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(body),
    });

    const data: any = await res.json();
    if (data.errors) throw new Error(`Twitter: ${data.errors[0]?.message ?? "Erro desconhecido"}`);

    return data.data?.id ?? `twitter-${Date.now()}`;
  }

  /**
   * TikTok Content Posting API v2
   * Requires: access_token with video.upload scope
   */
  private async publishToTikTok(post: { caption: string; mediaUrl: string | null }): Promise<string> {
    const accessToken = this.config.get("app.social.tiktok.accessToken");

    if (!accessToken) {
      this.logger.warn("[MOCK] TikTok: token não configurado");
      return `mock-tiktok-${Date.now()}`;
    }

    // TikTok Direct Post API (for photo/video content)
    const res = await fetch("https://open.tiktokapis.com/v2/post/publish/content/init/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        post_info: {
          title: post.caption.slice(0, 150),
          privacy_level: "SELF_ONLY", // creator changes later
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: post.mediaUrl,
        },
      }),
    });

    const data: any = await res.json();
    if (data.error?.code !== "ok" && data.error) {
      throw new Error(`TikTok: ${data.error.message ?? "Erro desconhecido"}`);
    }

    return data.data?.publish_id ?? `tiktok-${Date.now()}`;
  }
}
