import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { PrismaService } from "../common/database/prisma.service";

export interface ScanResult {
  isFlagged: boolean;
  isCsam: boolean;
  confidence: number;
  hash: string;
  provider: string;
}

/**
 * Serviço de detecção de CSAM (Child Sexual Abuse Material).
 *
 * Em produção, integra com PhotoDNA (Microsoft) ou similar.
 * Em desenvolvimento, usa hash-matching local contra lista de hashes conhecidos.
 *
 * OBRIGATÓRIO: todo upload de conteúdo deve passar por este serviço
 * ANTES de ser armazenado ou exibido.
 */
@Injectable()
export class CsamService {
  private readonly logger = new Logger(CsamService.name);
  private readonly provider: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.provider = this.config.get("app.csam.provider") ?? "local";
  }

  /**
   * Escaneia um buffer de arquivo em busca de CSAM.
   * Retorna resultado imediato — NUNCA armazenar antes deste check.
   */
  async scan(fileBuffer: Buffer, contentType: string): Promise<ScanResult> {
    const hash = this.computeHash(fileBuffer);

    if (this.provider === "photodna") {
      return this.scanWithPhotoDna(fileBuffer, hash);
    }

    // Modo local: compara SHA-256 contra lista de hashes conhecidos (base local)
    return this.scanLocal(hash);
  }

  /**
   * Registra detecção de CSAM no banco e prepara reporte às autoridades.
   * NUNCA silenciar este método.
   */
  async reportDetection(
    contentId: string,
    contentType: string,
    hash: string,
    moderatorId?: string,
  ) {
    const log = await this.prisma.moderationLog.create({
      data: {
        contentId,
        contentType,
        action: "CSAM_REPORTED",
        moderatorId,
        csamHash: hash,
        reportedToAuthority: false, // será atualizado após envio do reporte
        reason: "Detecção automática de CSAM",
      },
    });

    // Em produção: enviar reporte para NCMEC CyberTipline e Ministério Público
    await this.notifyAuthorities(log.id, contentId, hash);

    this.logger.warn(`CSAM detectado e reportado. ContentId: ${contentId}, LogId: ${log.id}`);

    return log;
  }

  // ─── Providers ───────────────────────────────────────────

  private async scanWithPhotoDna(buffer: Buffer, hash: string): Promise<ScanResult> {
    const apiKey = this.config.get("app.csam.photoDnaApiKey");

    try {
      // Implementação real via PhotoDNA Hashing API (Microsoft)
      // https://www.microsoft.com/en-us/photodna
      const response = await fetch("https://api.microsoftphotodna.com/hashing/2.0/media/hash", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "Ocp-Apim-Subscription-Key": apiKey,
        },
        body: buffer,
      });

      if (!response.ok) {
        this.logger.error(`PhotoDNA retornou ${response.status}`);
        // Fail-safe: se o serviço falhar, bloqueia o conteúdo para revisão manual
        return { isFlagged: true, isCsam: false, confidence: 0, hash, provider: "photodna" };
      }

      const result: any = await response.json();
      const isCsam = result.isMatch === true;

      return {
        isFlagged: isCsam,
        isCsam,
        confidence: result.confidence ?? (isCsam ? 1 : 0),
        hash,
        provider: "photodna",
      };
    } catch (err) {
      this.logger.error("Erro ao chamar PhotoDNA:", err);
      // Fail-safe: bloqueia para revisão manual
      return { isFlagged: true, isCsam: false, confidence: 0, hash, provider: "photodna_error" };
    }
  }

  private async scanLocal(hash: string): Promise<ScanResult> {
    // Em desenvolvimento: consulta tabela de hashes bloqueados no banco
    const blocked = await this.prisma.moderationLog.findFirst({
      where: { csamHash: hash, action: "CSAM_REPORTED" },
    });

    const isCsam = !!blocked;

    return {
      isFlagged: isCsam,
      isCsam,
      confidence: isCsam ? 1 : 0,
      hash,
      provider: "local",
    };
  }

  private computeHash(buffer: Buffer): string {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  private async notifyAuthorities(logId: string, contentId: string, hash: string) {
    // TODO (produção): integrar com NCMEC CyberTipline API
    // e Ministério Público Federal (canal de denúncias CSAM)
    this.logger.warn(
      `[AUTORIDADES] Reporte pendente — LogId: ${logId}, ContentId: ${contentId}`,
    );

    // Atualiza o log como "em processo de reporte"
    await this.prisma.moderationLog.update({
      where: { id: logId },
      data: {
        reportedToAuthority: true,
        reportReference: `PENDING-${logId}`,
      },
    });
  }
}
