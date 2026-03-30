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
 * Item 45 — AI Avatar do criador
 *
 * Fluxo:
 * 1. Criador faz upload de 50–200 fotos + áudio de referência (S3, bucket privado)
 * 2. Aceita o CONSENT_TEXT explícito (documentado no DB)
 * 3. Job de treinamento enfileirado → serviço externo (Replicate/RunPod LoRA)
 * 4. Ao completar: status = READY, modelRef salvo
 * 5. Criador (ou fã, se permitido) envia prompt → gera variação
 * 6. Output passa obrigatoriamente por CSAM check antes de ser disponibilizado
 *
 * Salvaguardas legais:
 * - Somente conteúdo do próprio criador (nunca rosto de terceiros)
 * - Consentimento documentado com timestamp e texto exato
 * - Avatares fictícios 100% (sem referência a pessoa real) são permitidos
 *   sem restrição de KYC, mas ainda passam por moderação
 * - Limite de gerações por dia configurável por avatar
 *
 * Produção: substituir `trainModelStub()` por SDK do Replicate/RunPod.
 */

const MAX_PHOTOS    = 200;
const MIN_PHOTOS    = 50;
const CONSENT_TEXT  =
  "Declaro que sou titular dos direitos sobre todas as imagens e áudios " +
  "enviados, que consinto com o uso para treinamento de IA no Inti.mate, " +
  "e que nenhum material retrata terceiros sem seu consentimento documentado.";

@Injectable()
export class AiAvatarService {
  private readonly logger = new Logger(AiAvatarService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Configurar avatar ───────────────────────────────────

  async initAvatar(creatorId: string) {
    // Verifica KYC
    const kyc = await this.prisma.ageVerification.findFirst({
      where: { userId: creatorId, status: "APPROVED", type: "DOCUMENT" },
    });
    if (!kyc) throw new ForbiddenException("KYC DOCUMENT necessário para criar AI Avatar");

    return this.prisma.aiAvatar.upsert({
      where:  { creatorId },
      create: { creatorId, consentText: CONSENT_TEXT, status: "PENDING_UPLOAD" },
      update: {},
    });
  }

  async getConsentText() {
    return { consentText: CONSENT_TEXT };
  }

  /**
   * Registra URLs das fotos e áudio (pré-assinadas, já feito upload para S3).
   * Valida quantidade mínima de fotos.
   */
  async submitAssets(
    creatorId: string,
    photoKeys: string[],
    audioKey?: string,
  ) {
    if (photoKeys.length < MIN_PHOTOS) {
      throw new BadRequestException(`Mínimo de ${MIN_PHOTOS} fotos necessárias`);
    }
    if (photoKeys.length > MAX_PHOTOS) {
      throw new BadRequestException(`Máximo de ${MAX_PHOTOS} fotos`);
    }

    const avatar = await this.prisma.aiAvatar.findUnique({ where: { creatorId } });
    if (!avatar) throw new NotFoundException("Inicie o avatar antes de enviar assets");
    if (!avatar.consentedAt) {
      throw new ForbiddenException("Aceite o termo de consentimento antes de enviar assets");
    }

    return this.prisma.aiAvatar.update({
      where: { creatorId },
      data:  { photoKeys, audioKey: audioKey ?? null, status: "QUEUED" },
    });
  }

  async acceptConsent(creatorId: string) {
    const avatar = await this.prisma.aiAvatar.findUnique({ where: { creatorId } });
    if (!avatar) throw new NotFoundException();

    return this.prisma.aiAvatar.update({
      where: { creatorId },
      data:  { consentedAt: new Date() },
    });
  }

  async configureAvatar(
    creatorId: string,
    allowFanGeneration: boolean,
    maxGenPerDay: number,
  ) {
    if (maxGenPerDay < 1 || maxGenPerDay > 100) {
      throw new BadRequestException("maxGenPerDay deve estar entre 1 e 100");
    }
    return this.prisma.aiAvatar.update({
      where: { creatorId },
      data:  { allowFanGeneration, maxGenPerDay },
    });
  }

  async getAvatar(creatorId: string) {
    return this.prisma.aiAvatar.findUnique({ where: { creatorId } });
  }

  async getAvatarPublicInfo(avatarId: string) {
    return this.prisma.aiAvatar.findUnique({
      where:  { id: avatarId },
      select: { id: true, status: true, allowFanGeneration: true, maxGenPerDay: true },
    });
  }

  // ─── Gerar variação ──────────────────────────────────────

  async generate(
    avatarId:    string,
    requestedBy: string,
    prompt:      string,
  ) {
    const avatar = await this.prisma.aiAvatar.findUnique({ where: { id: avatarId } });
    if (!avatar) throw new NotFoundException();
    if (avatar.status !== "READY") {
      throw new BadRequestException("Avatar ainda não está pronto para gerar conteúdo");
    }

    // Fã: verifica permissão + limite diário
    const isOwner = avatar.creatorId === requestedBy;
    if (!isOwner) {
      if (!avatar.allowFanGeneration) {
        throw new ForbiddenException("Este criador não permite gerações por fãs");
      }
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dailyCount = await this.prisma.aiAvatarGeneration.count({
      where: { avatarId, requestedBy, createdAt: { gte: today } },
    });
    if (dailyCount >= avatar.maxGenPerDay) {
      throw new ForbiddenException(`Limite de ${avatar.maxGenPerDay} gerações/dia atingido`);
    }

    const job = await this.prisma.aiAvatarGeneration.create({
      data: { avatarId, requestedBy, prompt, status: "QUEUED" },
    });

    // Dispara treinamento/geração em background (stub → Replicate em prod)
    this.runGenerationStub(job.id, avatar.modelRef ?? "").catch((e) =>
      this.logger.error(`Geração ${job.id} falhou:`, e),
    );

    return { jobId: job.id, status: "QUEUED" };
  }

  async getGeneration(jobId: string, requestedBy: string) {
    const job = await this.prisma.aiAvatarGeneration.findUnique({ where: { id: jobId } });
    if (!job || job.requestedBy !== requestedBy) throw new NotFoundException();
    return job;
  }

  async listGenerations(avatarId: string, creatorId: string) {
    const avatar = await this.prisma.aiAvatar.findUnique({ where: { id: avatarId } });
    if (!avatar || avatar.creatorId !== creatorId) throw new ForbiddenException();

    return this.prisma.aiAvatarGeneration.findMany({
      where:   { avatarId },
      orderBy: { createdAt: "desc" },
      take:    50,
      select:  { id: true, prompt: true, status: true, resultKey: true, moderationPassed: true, createdAt: true },
    });
  }

  // ─── Processamento (stub → Replicate/RunPod em prod) ────

  @Cron(CronExpression.EVERY_MINUTE)
  async processTrainingQueue() {
    const queued = await this.prisma.aiAvatar.findMany({
      where: { status: "QUEUED" },
      take:  3,
    });

    for (const avatar of queued) {
      await this.prisma.aiAvatar.update({
        where: { id: avatar.id },
        data:  { status: "TRAINING" },
      });

      // Stub: em prod chamar Replicate Trainings API
      // const training = await replicate.trainings.create({ ... })
      this.trainModelStub(avatar.id).catch((e) =>
        this.logger.error(`Treino ${avatar.id} falhou:`, e),
      );
    }
  }

  private async trainModelStub(avatarId: string) {
    // Simula latência de treinamento (prod: webhook do Replicate)
    await new Promise((r) => setTimeout(r, 3_000));

    await this.prisma.aiAvatar.update({
      where: { id: avatarId },
      data:  { status: "READY", modelRef: `mock-lora-${avatarId.slice(0, 8)}` },
    });

    this.logger.log(`AiAvatar READY: ${avatarId}`);
  }

  private async runGenerationStub(jobId: string, modelRef: string) {
    await this.prisma.aiAvatarGeneration.update({
      where: { id: jobId },
      data:  { status: "PROCESSING" },
    });

    // Stub: em prod → replicate.run(modelRef, { input: { prompt } })
    await new Promise((r) => setTimeout(r, 2_000));

    // Simula moderação (CSAM check obrigatório no output)
    const moderationPassed = true; // prod: chamar CSAM service
    const resultKey = moderationPassed
      ? `generated/${jobId}/output.jpg`
      : null;

    await this.prisma.aiAvatarGeneration.update({
      where: { id: jobId },
      data:  {
        status:           moderationPassed ? "DONE" : "FAILED",
        resultKey,
        moderationPassed,
        moderatedAt:      new Date(),
        errorMsg:         moderationPassed ? null : "Reprovado na moderação de conteúdo",
      },
    });
  }
}
