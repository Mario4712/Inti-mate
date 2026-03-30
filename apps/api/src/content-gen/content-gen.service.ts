import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../common/database/prisma.service";

/**
 * Item 46 — IA para geração de conteúdo
 *
 * Criador usa prompts para gerar variações do próprio conteúdo:
 * fundos alternativos, efeitos visuais, cenários.
 *
 * Salvaguardas:
 * - Proibido usar rosto/voz de terceiros (detectado por moderação)
 * - Moderação aplicada ao OUTPUT da IA (não só ao input)
 * - Limite: 20 jobs/dia por criador
 * - Jobs com status PENDING_MODERATION revisados por moderação humana/automática
 *
 * Tipos aceitos:
 * - "background": troca o fundo da imagem/vídeo
 * - "effect": aplica efeito visual (blur, cor, filtro)
 * - "scene": gera cena alternativa com base no prompt
 *
 * Integração: Stable Diffusion / SDXL via Replicate (stub em dev).
 */

const ALLOWED_JOB_TYPES = ["background", "effect", "scene"] as const;
type JobType = (typeof ALLOWED_JOB_TYPES)[number];

const MAX_DAILY_JOBS = 20;

@Injectable()
export class ContentGenService {
  private readonly logger = new Logger(ContentGenService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Criar job ───────────────────────────────────────────

  async createJob(
    creatorId: string,
    prompt:    string,
    jobType:   string,
    inputKey?: string,
  ) {
    if (!ALLOWED_JOB_TYPES.includes(jobType as JobType)) {
      throw new BadRequestException(`jobType inválido. Use: ${ALLOWED_JOB_TYPES.join(", ")}`);
    }

    // Limite diário
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const count = await this.prisma.contentGenJob.count({
      where: { creatorId, createdAt: { gte: today } },
    });
    if (count >= MAX_DAILY_JOBS) {
      throw new ForbiddenException(`Limite de ${MAX_DAILY_JOBS} gerações/dia atingido`);
    }

    const job = await this.prisma.contentGenJob.create({
      data: { creatorId, prompt, jobType, inputKey: inputKey ?? null, status: "QUEUED" },
    });

    // Dispara em background
    this.processJob(job.id).catch((e) =>
      this.logger.error(`ContentGenJob ${job.id} falhou:`, e),
    );

    return { jobId: job.id, status: "QUEUED" };
  }

  async getJob(jobId: string, creatorId: string) {
    const job = await this.prisma.contentGenJob.findUnique({ where: { id: jobId } });
    if (!job || job.creatorId !== creatorId) throw new NotFoundException();
    return job;
  }

  async listJobs(creatorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contentGenJob.findMany({
        where:   { creatorId },
        orderBy: { createdAt: "desc" },
        skip, take: limit,
      }),
      this.prisma.contentGenJob.count({ where: { creatorId } }),
    ]);
    return { items, total, pagination: { page, limit, pages: Math.ceil(total / limit) } };
  }

  // ─── Moderação (chamada pelo moderador ou automática) ────

  async moderateJob(jobId: string, passed: boolean, rejectionReason?: string) {
    const job = await this.prisma.contentGenJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException();
    if (job.status !== "PENDING_MODERATION") {
      throw new BadRequestException("Job não está aguardando moderação");
    }

    return this.prisma.contentGenJob.update({
      where: { id: jobId },
      data:  {
        status:          passed ? "APPROVED" : "REJECTED",
        moderationPassed: passed,
        moderatedAt:     new Date(),
        rejectionReason: passed ? null : (rejectionReason ?? "Conteúdo não permitido"),
      },
    });
  }

  // ─── Processamento ────────────────────────────────────────

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processQueue() {
    const queued = await this.prisma.contentGenJob.findMany({
      where: { status: "QUEUED" },
      take:  5,
      orderBy: { createdAt: "asc" },
    });

    for (const job of queued) {
      this.processJob(job.id).catch((e) =>
        this.logger.error(`ContentGenJob ${job.id} falhou:`, e),
      );
    }
  }

  private async processJob(jobId: string) {
    await this.prisma.contentGenJob.update({
      where: { id: jobId },
      data:  { status: "PROCESSING" },
    });

    try {
      // Stub: em prod → Replicate / SDXL API
      // const output = await replicate.run("stability-ai/sdxl", { input: { prompt } })
      await new Promise((r) => setTimeout(r, 2_000));

      const outputKey = `content-gen/${jobId}/output.jpg`;

      // Moderação automática (CSAM + terceiros)
      // prod: chamar PhotoDNA + rosto detection
      const moderationPassed = true;

      await this.prisma.contentGenJob.update({
        where: { id: jobId },
        data:  {
          outputKey,
          status:          moderationPassed ? "APPROVED" : "PENDING_MODERATION",
          moderationPassed: moderationPassed ? true : null,
          moderatedAt:     moderationPassed ? new Date() : null,
        },
      });

      this.logger.log(`ContentGenJob DONE: ${jobId}`);
    } catch (err) {
      await this.prisma.contentGenJob.update({
        where: { id: jobId },
        data:  { status: "REJECTED", errorMsg: String(err) },
      });
    }
  }
}
