import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PrismaService } from "../common/database/prisma.service";

/**
 * Item 48 — Realidade Aumentada / VR
 *
 * Suporte a conteúdo VR180° e VR360°:
 * - Criador faz upload de vídeo esférico (S3, bucket privado)
 * - Metadados VR armazenados em VrContent (ligado a Media)
 * - Três qualidades: 2K / 4K / 8K (upgrade in-app desbloqueia resolução maior)
 * - Acesso via pre-signed URLs (duração: 2h)
 * - Frontend: WebXR (A-Frame) para browser, cardboard via app mobile
 *
 * Upgrades de resolução:
 * - SUBSCRIBERS: acesso a 2K (padrão)
 * - PPV ou plano premium: acesso a 4K
 * - VerifiedTier: acesso a 8K
 *
 * Sem integração com hardware proprietário (Oculus SDK, etc) no MVP.
 */

const URL_EXPIRY_SEC = 7_200; // 2 horas

@Injectable()
export class VrContentService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private prisma:  PrismaService,
    private config:  ConfigService,
  ) {
    this.s3 = new S3Client({
      endpoint:        config.get("app.s3.endpoint"),
      region:          config.get("app.s3.region") ?? "us-east-1",
      credentials: {
        accessKeyId:     config.get("app.s3.accessKey") ?? "",
        secretAccessKey: config.get("app.s3.secretKey") ?? "",
      },
      forcePathStyle: true,
    });
    this.bucket = config.get("app.s3.bucketMedia") ?? "media";
  }

  // ─── Criador: registrar metadados VR ────────────────────

  async attachVrMetadata(
    creatorId: string,
    mediaId:   string,
    data: {
      format:     "VR180" | "VR360";
      resolution: string;
      stereoMode: string;
      fovDegrees: number;
      key2K?:     string;
      key4K?:     string;
      key8K?:     string;
    },
  ) {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException("Conteúdo não encontrado");
    if (media.creatorId !== creatorId) throw new ForbiddenException();

    if (!data.key2K && !data.key4K && !data.key8K) {
      throw new BadRequestException("Pelo menos uma qualidade (key2K, key4K ou key8K) é obrigatória");
    }

    if (data.fovDegrees !== 180 && data.fovDegrees !== 360) {
      throw new BadRequestException("fovDegrees deve ser 180 ou 360");
    }

    return this.prisma.vrContent.upsert({
      where:  { mediaId },
      create: { mediaId, ...data },
      update: { ...data },
    });
  }

  async getVrMetadata(mediaId: string) {
    const vr = await this.prisma.vrContent.findUnique({ where: { mediaId } });
    if (!vr) throw new NotFoundException("Conteúdo VR não encontrado");
    return vr;
  }

  async listVrContent(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.vrContent.findMany({
        skip, take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          media: {
            select: {
              id: true, title: true, thumbnailUrl: true,
              creatorId: true, visibility: true, status: true,
            },
          },
        },
      }),
      this.prisma.vrContent.count(),
    ]);
    return { items, total, pagination: { page, limit, pages: Math.ceil(total / limit) } };
  }

  // ─── Acesso por qualidade com upgrade in-app ─────────────

  async getAccessUrl(
    viewerId: string,
    mediaId:  string,
    quality:  "2K" | "4K" | "8K",
  ) {
    const vr = await this.prisma.vrContent.findUnique({ where: { mediaId } });
    if (!vr) throw new NotFoundException();

    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException();

    // Determina tier do viewer
    const tier = await this.resolveViewerTier(viewerId, media.creatorId);

    // Valida acesso por qualidade
    if (quality === "8K" && tier !== "VERIFIED") {
      throw new ForbiddenException("Resolução 8K disponível apenas para membros Verified Tier");
    }
    if (quality === "4K" && tier === "SUBSCRIBER") {
      throw new ForbiddenException("Resolução 4K requer assinatura PPV ou plano premium");
    }

    const s3Key = quality === "8K" ? vr.key8K
                : quality === "4K" ? vr.key4K
                : vr.key2K;

    if (!s3Key) {
      throw new NotFoundException(`Resolução ${quality} não disponível para este conteúdo`);
    }

    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: s3Key }),
      { expiresIn: URL_EXPIRY_SEC },
    );

    return {
      url,
      expiresIn:  URL_EXPIRY_SEC,
      format:     vr.format,
      stereoMode: vr.stereoMode,
      fovDegrees: vr.fovDegrees,
      quality,
    };
  }

  // ─── WebXR config (usado pelo player no browser/mobile) ──

  async getWebXrConfig(mediaId: string, viewerId: string) {
    const vr = await this.prisma.vrContent.findUnique({ where: { mediaId } });
    if (!vr) throw new NotFoundException();

    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException();

    const tier = await this.resolveViewerTier(viewerId, media.creatorId);
    const maxQuality = tier === "VERIFIED" ? "8K"
                     : tier === "PREMIUM"  ? "4K"
                     : "2K";

    // Retorna configuração para o A-Frame player
    return {
      format:      vr.format,
      stereoMode:  vr.stereoMode,
      fovDegrees:  vr.fovDegrees,
      maxQuality,
      availableQualities: [
        vr.key2K ? "2K" : null,
        vr.key4K ? "4K" : null,
        vr.key8K ? "8K" : null,
      ].filter(Boolean),
    };
  }

  private async resolveViewerTier(
    viewerId:  string,
    creatorId: string,
  ): Promise<"SUBSCRIBER" | "PREMIUM" | "VERIFIED"> {
    // Verified tier
    const verified = await this.prisma.verifiedTierAccess.findFirst({
      where: { userId: viewerId, status: "ACTIVE" },
    });
    if (verified) return "VERIFIED";

    // PPV purchase ou plano premium
    const ppv = await this.prisma.ppvPurchase.findFirst({
      where: { userId: viewerId },
    });
    if (ppv) return "PREMIUM";

    return "SUBSCRIBER";
  }
}
