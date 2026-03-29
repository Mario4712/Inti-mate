import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";

/**
 * Tier "Acesso Verificado" — seção premium para usuários com KYC completo.
 *
 * Regras de negócio:
 * - Requer KYC com status APPROVED (documento + selfie verificados)
 * - Moderação REFORÇADA — conteúdo passa por revisão humana adicional
 * - Acesso pode ser revogado imediatamente se KYC for cancelado/rejeitado
 * - Não reduz moderação: CSAM scan continua obrigatório
 */
@Injectable()
export class VerifiedTierService {
  private readonly logger = new Logger(VerifiedTierService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Solicitar acesso ao tier ─────────────────────────────

  async requestAccess(userId: string): Promise<{ status: string; message: string }> {
    const kyc = await this.prisma.ageVerification.findUnique({ where: { userId } });

    if (!kyc || kyc.status !== "APPROVED") {
      throw new ForbiddenException(
        "Acesso Verificado requer verificação de identidade completa (KYC com documento + selfie aprovados).",
      );
    }

    const existing = await this.prisma.verifiedTierAccess.findUnique({ where: { userId } });

    if (existing?.status === "ACTIVE") {
      return { status: "ACTIVE", message: "Você já possui Acesso Verificado." };
    }

    if (existing?.status === "SUSPENDED") {
      return { status: "SUSPENDED", message: "Seu Acesso Verificado está suspenso. Entre em contato com o suporte." };
    }

    const access = await this.prisma.verifiedTierAccess.upsert({
      where:  { userId },
      create: { userId, status: "ACTIVE", grantedAt: new Date(), kycVerifId: kyc.id },
      update: { status: "ACTIVE", grantedAt: new Date(), revokedAt: null, kycVerifId: kyc.id },
    });

    this.logger.log(`VerifiedTier concedido para usuário ${userId}`);
    return {
      status:  access.status,
      message: "Acesso Verificado ativado. Conteúdo nesta seção passa por moderação humana reforçada.",
    };
  }

  async getStatus(userId: string) {
    const access = await this.prisma.verifiedTierAccess.findUnique({ where: { userId } });
    if (!access) return { hasAccess: false, status: null };

    // Re-verifica KYC ao consultar (pode ter sido revogado)
    const kyc = await this.prisma.ageVerification.findUnique({ where: { userId } });
    if (!kyc || kyc.status !== "APPROVED") {
      // Revogar automaticamente
      if (access.status === "ACTIVE") {
        await this.revokeAccess(userId, "KYC revogado ou rejeitado");
      }
      return { hasAccess: false, status: "REVOKED" };
    }

    return {
      hasAccess: access.status === "ACTIVE",
      status:    access.status,
      grantedAt: access.grantedAt,
    };
  }

  // ─── Revogar acesso (admin ou automático) ─────────────────

  async revokeAccess(userId: string, reason?: string) {
    const access = await this.prisma.verifiedTierAccess.findUnique({ where: { userId } });
    if (!access) throw new NotFoundException("Usuário não tem Acesso Verificado");

    await this.prisma.verifiedTierAccess.update({
      where: { userId },
      data:  { status: "SUSPENDED", revokedAt: new Date() },
    });

    this.logger.warn(`VerifiedTier revogado para ${userId}. Razão: ${reason ?? "não informada"}`);
    return { revoked: true };
  }

  // ─── Verificar acesso em middleware ──────────────────────

  async assertAccess(userId: string): Promise<void> {
    const { hasAccess } = await this.getStatus(userId);
    if (!hasAccess) {
      throw new ForbiddenException(
        "Esta seção requer Acesso Verificado. Complete a verificação de identidade para desbloquear.",
      );
    }
  }

  // ─── Admin: listar usuários com acesso ────────────────────

  async listVerifiedUsers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.verifiedTierAccess.findMany({
        where:   { status: "ACTIVE" },
        orderBy: { grantedAt: "desc" },
        skip, take: limit,
        select:  { userId: true, grantedAt: true, status: true },
      }),
      this.prisma.verifiedTierAccess.count({ where: { status: "ACTIVE" } }),
    ]);
    return { items, total };
  }
}
