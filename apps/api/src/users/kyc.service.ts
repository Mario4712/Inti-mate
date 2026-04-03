import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../common/database/prisma.service";

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly provider: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.provider = this.config.get("app.kyc.provider") ?? "mock";
  }

  async getStatus(userId: string) {
    const verification = await this.prisma.ageVerification.findUnique({
      where: { userId },
      select: {
        status: true,
        type: true,
        verifiedAt: true,
        rejectedReason: true,
        createdAt: true,
        updatedAt: true,
        // Nunca expor URLs dos documentos ao usuário
      },
    });

    if (!verification) throw new NotFoundException("Verificação não encontrada");
    return verification;
  }

  /**
   * Submissão de documentos para KYC de criadores.
   * Em produção, envia para Unico Check / Serpro.
   * Em desenvolvimento (mock), aprova automaticamente.
   */
  async submitDocuments(userId: string, body: { documentType: string; documentUrl: string; selfieUrl: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();

    const verification = await this.prisma.ageVerification.findUnique({ where: { userId } });
    if (!verification) throw new NotFoundException("Registro de verificação não encontrado");

    if (verification.status === "APPROVED") {
      throw new BadRequestException("KYC já aprovado");
    }

    if (!["RG", "CNH", "PASSAPORTE"].includes(body.documentType)) {
      throw new BadRequestException("Tipo de documento inválido");
    }

    // Atualiza os dados do documento
    await this.prisma.ageVerification.update({
      where: { userId },
      data: {
        documentType: body.documentType,
        documentUrl: body.documentUrl,   // URL do S3 (bucket KYC — acesso restrito)
        selfieUrl: body.selfieUrl,
        kycProvider: this.provider,
        status: "PENDING",
      },
    });

    if (this.provider === "mock") {
      // Mock: aprova em 2 segundos (apenas dev)
      setTimeout(() => this.approveKyc(userId), 2000);
      this.logger.log(`[MOCK KYC] Auto-aprovando userId=${userId}`);
    } else {
      await this.sendToKycProvider(userId, body);
    }

    return {
      message: "Documentos enviados. Aguarde a verificação (pode levar até 24h).",
      status: "PENDING",
    };
  }

  async approveKyc(userId: string) {
    await this.prisma.ageVerification.update({
      where: { userId },
      data: {
        status: "APPROVED",
        verifiedAt: new Date(),
      },
    });
    this.logger.log(`KYC aprovado para userId=${userId}`);
  }

  async rejectKyc(userId: string, reason: string) {
    await this.prisma.ageVerification.update({
      where: { userId },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectedReason: reason,
      },
    });
  }

  private async sendToKycProvider(userId: string, body: any) {
    if (this.provider === "unico") {
      await this.sendToUnico(userId, body);
    } else if (this.provider === "serpro") {
      this.logger.log(`[SERPRO] KYC submission for user ${userId} — requires Serpro government contract`);
    } else {
      this.logger.warn(`KYC provider '${this.provider}' nao reconhecido`);
    }
  }

  private async sendToUnico(userId: string, body: any) {
    const clientId = this.config.get("app.kyc.unicoClientId");
    const clientSecret = this.config.get("app.kyc.unicoClientSecret");

    if (!clientId || !clientSecret) {
      this.logger.error("Unico Check credentials not configured");
      return;
    }

    try {
      const tokenRes = await fetch("https://api.unico.io/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenRes.ok) {
        this.logger.error(`Unico token error: ${tokenRes.status}`);
        return;
      }

      const { access_token } = (await tokenRes.json()) as any;

      const verifyRes = await fetch("https://api.unico.io/v1/processes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          subject: { code: userId },
          document: { type: body.documentType, url: body.documentUrl },
          selfie: { url: body.selfieUrl },
          callbackUrl: `${this.config.get("app.frontendUrl")?.replace(":3000", ":3001")}/api/v1/users/kyc/webhook`,
        }),
      });

      if (!verifyRes.ok) {
        this.logger.error(`Unico process error: ${verifyRes.status}`);
        return;
      }

      const result = (await verifyRes.json()) as any;
      this.logger.log(`Unico process created: ${result.id} for user ${userId}`);
    } catch (err) {
      this.logger.error("Unico Check API error:", err);
    }
  }
}
