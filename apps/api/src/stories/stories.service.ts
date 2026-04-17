import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../common/database/prisma.service";
import { StorageService } from "../content/storage.service";
import { MediaProcessorService } from "../content/media-processor.service";
import { ModerationService } from "../moderation/moderation.service";
import { MediaType } from "@intimare/database";

const STORY_TTL_HOURS = 24;
const ALLOWED_MIME    = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"];

const MIME_TO_MEDIA_TYPE: Record<string, MediaType> = {
  "image/jpeg": MediaType.PHOTO,
  "image/png":  MediaType.PHOTO,
  "image/webp": MediaType.PHOTO,
  "video/mp4":  MediaType.VIDEO,
  "video/webm": MediaType.VIDEO,
};

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);

  constructor(
    private prisma:     PrismaService,
    private storage:    StorageService,
    private processor:  MediaProcessorService,
    private moderation: ModerationService,
  ) {}

  // ─── Criar Story ─────────────────────────────────────────

  async createStory(
    creatorId: string,
    buffer:    Buffer,
    mimeType:  string,
  ) {
    if (!ALLOWED_MIME.includes(mimeType)) {
      throw new ForbiddenException(`Tipo de arquivo não suportado: ${mimeType}`);
    }

    const isImage = mimeType.startsWith("image/");

    // Moderação obrigatória
    const mod = await this.moderation.processUpload(
      buffer,
      mimeType,
      isImage ? "photo" : "video",
      creatorId,
      `story-${Date.now()}`,
    );

    if (!mod.approved) {
      throw new ForbiddenException("Conteúdo rejeitado pela moderação");
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + STORY_TTL_HOURS);

    // Faz upload direto (stories não precisam de HLS)
    const { url: mediaUrl } = await this.storage.uploadMedia(
      buffer,
      mimeType,
      `creators/${creatorId}/stories`,
    );

    const mediaType = MIME_TO_MEDIA_TYPE[mimeType] ?? MediaType.PHOTO;

    const story = await this.prisma.story.create({
      data: {
        creatorId,
        mediaUrl,
        mediaType,
        expiresAt,
      },
    });

    return {
      id:        story.id,
      mediaUrl:  story.mediaUrl,
      expiresAt: story.expiresAt,
    };
  }

  // ─── Feed de Stories ──────────────────────────────────────

  async getStoriesFeed(viewerId: string) {
    // Busca criadores que o viewer assina
    const subs = await this.prisma.subscription.findMany({
      where: {
        subscriberId: viewerId,
        status: { in: ["ACTIVE", "PAST_DUE"] },
        currentPeriodEnd: { gte: new Date() },
      },
      select: { creatorId: true },
    });

    const creatorIds = subs.map((s) => s.creatorId);

    if (creatorIds.length === 0) return [];

    const stories = await this.prisma.story.findMany({
      where: {
        creatorId:  { in: creatorIds },
        expiresAt:  { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
      include: {
        views: {
          where: { viewerId },
          select: { id: true },
        },
      },
    });

    return stories.map((s) => ({
      id:        s.id,
      creatorId: s.creatorId,
      mediaUrl:  s.mediaUrl,
      mediaType: s.mediaType,
      expiresAt: s.expiresAt,
      viewed:    s.views.length > 0,
      viewCount: s.viewCount,
    }));
  }

  async getCreatorStories(creatorId: string, viewerId: string) {
    const hasAccess =
      creatorId === viewerId ||
      (await this.checkAccess(viewerId, creatorId));

    const stories = await this.prisma.story.findMany({
      where: {
        creatorId,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "asc" },
    });

    return stories.map((s) => ({
      id:        s.id,
      mediaUrl:  hasAccess ? s.mediaUrl : null,
      mediaType: s.mediaType,
      expiresAt: s.expiresAt,
      viewCount: s.viewCount,
      locked:    !hasAccess,
    }));
  }

  // ─── Registrar visualização ───────────────────────────────

  async recordView(storyId: string, viewerId: string) {
    const story = await this.prisma.story.findFirst({
      where: { id: storyId, expiresAt: { gte: new Date() } },
    });
    if (!story) throw new NotFoundException("Story não encontrado ou expirado");

    const hasAccess =
      story.creatorId === viewerId ||
      (await this.checkAccess(viewerId, story.creatorId));
    if (!hasAccess) throw new ForbiddenException("Acesso exclusivo para assinantes");

    // Upsert para evitar duplicatas
    await this.prisma.$transaction([
      this.prisma.storyView.upsert({
        where:  { storyId_viewerId: { storyId, viewerId } },
        update: { viewedAt: new Date() },
        create: { storyId, viewerId },
      }),
      this.prisma.story.update({
        where: { id: storyId },
        data:  { viewCount: { increment: 1 } },
      }),
    ]);

    return { ok: true };
  }

  // ─── Cleanup automático ───────────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async expireStories() {
    // Deleta stories expirados e seus arquivos
    const expired = await this.prisma.story.findMany({
      where: {
        expiresAt: { lt: new Date() },
      },
      select: { id: true, mediaUrl: true },
    });

    for (const story of expired) {
      try {
        if (story.mediaUrl) {
          const key = story.mediaUrl.split("/").slice(3).join("/");
          await this.storage.deleteMedia(key).catch(() => {});
        }
        await this.prisma.story.delete({
          where: { id: story.id },
        });
      } catch (err) {
        this.logger.error(`Erro ao expirar story ${story.id}:`, err);
      }
    }

    if (expired.length > 0) {
      this.logger.log(`Stories expirados: ${expired.length}`);
    }
  }

  // ─── Enquetes (Polls) ─────────────────────────────────────

  async createPoll(storyId: string, creatorId: string, options: string[]) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException("Story não encontrado");
    if (story.creatorId !== creatorId) throw new ForbiddenException();
    if (options.length < 2 || options.length > 4) {
      throw new BadRequestException("Enquete deve ter entre 2 e 4 opções.");
    }
    return this.prisma.storyPoll.create({
      data: {
        storyId,
        options: {
          create: options.map((text, order) => ({ text, order })),
        },
      },
      include: { options: { orderBy: { order: "asc" } } },
    });
  }

  async vote(storyId: string, optionId: string, voterId: string) {
    const story = await this.prisma.story.findFirst({
      where: { id: storyId, expiresAt: { gte: new Date() } },
    });
    if (!story) throw new NotFoundException("Story não encontrado ou expirado");

    const hasAccess = story.creatorId === voterId || (await this.checkAccess(voterId, story.creatorId));
    if (!hasAccess) throw new ForbiddenException("Acesso exclusivo para assinantes");

    const option = await this.prisma.storyPollOption.findFirst({
      where: { id: optionId, poll: { storyId } },
    });
    if (!option) throw new NotFoundException("Opção não encontrada");

    await this.prisma.storyPollVote.upsert({
      where: { optionId_voterId: { optionId, voterId } },
      create: { optionId, voterId },
      update: {},
    });

    return this.getPollResults(storyId, voterId);
  }

  async getPollResults(storyId: string, viewerId: string) {
    const poll = await this.prisma.storyPoll.findUnique({
      where: { storyId },
      include: {
        options: {
          orderBy: { order: "asc" },
          include: { votes: true },
        },
      },
    });
    if (!poll) return null;

    const total = poll.options.reduce((acc, o) => acc + o.votes.length, 0);
    const myVoteOptionId = poll.options.find((o) =>
      o.votes.some((v) => v.voterId === viewerId)
    )?.id ?? null;

    return {
      id: poll.id,
      storyId,
      total,
      myVoteOptionId,
      options: poll.options.map((o) => ({
        id: o.id,
        text: o.text,
        votes: o.votes.length,
        pct: total > 0 ? Math.round((o.votes.length / total) * 100) : 0,
      })),
    };
  }

  // ─── Helpers ─────────────────────────────────────────────

  private async checkAccess(subscriberId: string, creatorId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        subscriberId,
        creatorId,
        status: { in: ["ACTIVE", "PAST_DUE"] },
        currentPeriodEnd: { gte: new Date() },
      },
    });
    return !!sub;
  }
}
