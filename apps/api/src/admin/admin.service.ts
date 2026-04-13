import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Dashboard ───────────────────────────────────────────

  async getDashboard() {
    const [
      totalUsers,
      totalCreators,
      totalConsumers,
      activeSubscriptions,
      pendingKyc,
      pendingWithdrawals,
      pendingContent,
      pendingReports,
      recentRevenue,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { role: "CREATOR", deletedAt: null } }),
      this.prisma.user.count({ where: { role: "CONSUMER", deletedAt: null } }),
      this.prisma.subscription.count({ where: { status: "ACTIVE" } }),
      this.prisma.ageVerification.count({ where: { status: "PENDING" } }),
      this.prisma.withdrawal.count({ where: { status: "PENDING" } }),
      this.prisma.media.count({ where: { status: "PENDING_REVIEW" } }),
      this.prisma.report.count({ where: { status: "PENDING" } }),
      this.prisma.transaction.aggregate({
        where: {
          status: "PAID",
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        _sum: { grossAmount: true },
      }),
    ]);

    return {
      users: { total: totalUsers, creators: totalCreators, consumers: totalConsumers },
      activeSubscriptions,
      pendingKyc,
      pendingWithdrawals,
      pendingContent,
      pendingReports,
      revenueLastMonth: {
        cents: recentRevenue._sum.grossAmount ?? 0,
        brl: (((recentRevenue._sum.grossAmount ?? 0) as number) / 100).toFixed(2),
      },
    };
  }

  // ─── Usuários ─────────────────────────────────────────────

  async listUsers(opts: { page: number; limit: number; role?: string; status?: string; q?: string }) {
    const { page, limit, role, status, q } = opts;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (role)   where.role   = role;
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { username: { contains: q, mode: "insensitive" } },
        { email:    { contains: q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip, take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, username: true, email: true, role: true, status: true,
          createdAt: true, lastLoginAt: true,
          profile: { select: { artisticName: true, avatarUrl: true } },
          ageVerification: { select: { status: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => ({
        ...u,
        artisticName: u.profile?.artisticName ?? u.username,
        avatarUrl:    u.profile?.avatarUrl    ?? null,
        kycStatus:    u.ageVerification?.status ?? null,
        profile:      undefined,
        ageVerification: undefined,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, email: true, role: true, status: true,
        createdAt: true, lastLoginAt: true, bannedAt: true, banReason: true,
        profile: { select: { artisticName: true, avatarUrl: true, bio: true, category: true, country: true } },
        ageVerification: { select: { status: true, verifiedAt: true, rejectedReason: true, documentType: true } },
        creatorBalance: { select: { availableAmount: true, pendingAmount: true, totalEarned: true } },
        _count: {
          select: {
            mySubscriptions: true,
            subscriptions: true,
            media: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException("Usuário não encontrado");
    return user;
  }

  async banUser(userId: string, reason: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Usuário não encontrado");
    if (user.status === "BANNED") throw new BadRequestException("Usuário já está banido");

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: "BANNED", bannedAt: new Date(), banReason: reason },
    });

    this.logger.warn(`Admin ${adminId} baniu usuário ${userId}. Motivo: ${reason}`);
    return { message: "Usuário banido com sucesso" };
  }

  async unbanUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Usuário não encontrado");
    if (user.status !== "BANNED") throw new BadRequestException("Usuário não está banido");

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: "ACTIVE", bannedAt: null, banReason: null },
    });

    this.logger.log(`Admin ${adminId} desbanou usuário ${userId}`);
    return { message: "Usuário desbanido com sucesso" };
  }

  async changeRole(userId: string, role: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Usuário não encontrado");

    await this.prisma.user.update({ where: { id: userId }, data: { role: role as any } });

    this.logger.log(`Admin ${adminId} alterou role de ${userId}: ${user.role} → ${role}`);
    return { message: `Role alterada para ${role}` };
  }

  async featureUser(userId: string, featured: boolean) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException("Perfil não encontrado");

    await this.prisma.userProfile.update({ where: { userId }, data: { featured } });
    return { message: featured ? "Criador destacado" : "Destaque removido" };
  }

  // ─── KYC ─────────────────────────────────────────────────

  async listKyc(opts: { page: number; limit: number; status?: string }) {
    const { page, limit, status } = opts;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    else where.status = "PENDING"; // padrão: mostrar pendentes

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ageVerification.findMany({
        where,
        skip, take: limit,
        orderBy: { createdAt: "asc" }, // mais antigos primeiro (fila FIFO)
        select: {
          id: true, userId: true, status: true, type: true,
          documentType: true, verifiedAt: true, rejectedAt: true,
          rejectedReason: true, createdAt: true,
          user: { select: { username: true, email: true, profile: { select: { artisticName: true } } } },
        },
      }),
      this.prisma.ageVerification.count({ where }),
    ]);

    return {
      items: items.map((k) => ({
        ...k,
        artisticName: k.user?.profile?.artisticName ?? k.user?.username ?? "",
        email:        k.user?.email ?? "",
        username:     k.user?.username ?? "",
        user: undefined,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async approveKyc(userId: string, adminId: string) {
    const kyc = await this.prisma.ageVerification.findUnique({ where: { userId } });
    if (!kyc) throw new NotFoundException("Verificação KYC não encontrada");
    if (kyc.status === "APPROVED") throw new BadRequestException("KYC já aprovado");

    await this.prisma.ageVerification.update({
      where: { userId },
      data: { status: "APPROVED", verifiedAt: new Date() },
    });

    this.logger.log(`Admin ${adminId} aprovou KYC do usuário ${userId}`);
    return { message: "KYC aprovado com sucesso" };
  }

  async rejectKyc(userId: string, reason: string, adminId: string) {
    const kyc = await this.prisma.ageVerification.findUnique({ where: { userId } });
    if (!kyc) throw new NotFoundException("Verificação KYC não encontrada");

    await this.prisma.ageVerification.update({
      where: { userId },
      data: { status: "REJECTED", rejectedAt: new Date(), rejectedReason: reason },
    });

    this.logger.log(`Admin ${adminId} rejeitou KYC do usuário ${userId}. Motivo: ${reason}`);
    return { message: "KYC rejeitado" };
  }

  // ─── Saques ──────────────────────────────────────────────

  async listWithdrawals(opts: { page: number; limit: number; status?: string }) {
    const { page, limit, status } = opts;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    else where.status = "PENDING"; // padrão: pendentes

    const [items, total] = await this.prisma.$transaction([
      this.prisma.withdrawal.findMany({
        where,
        skip, take: limit,
        orderBy: { scheduledDate: "asc" }, // mais urgentes primeiro
        select: {
          id: true, creatorId: true, amount: true, status: true,
          pixKeyType: true, scheduledDate: true, processedAt: true,
          failureReason: true, createdAt: true,
          creator: { select: { username: true, profile: { select: { artisticName: true } } } },
        },
      }),
      this.prisma.withdrawal.count({ where }),
    ]);

    return {
      items: items.map((w) => ({
        ...w,
        amountBrl:   (w.amount / 100).toFixed(2),
        artisticName: w.creator?.profile?.artisticName ?? w.creator?.username ?? "",
        username:    w.creator?.username ?? "",
        creator:     undefined,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async processWithdrawal(withdrawalId: string, status: "COMPLETED" | "FAILED", adminId: string, failureReason?: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundException("Saque não encontrado");
    if (withdrawal.status !== "PENDING" && withdrawal.status !== "PROCESSING") {
      throw new BadRequestException("Saque não está pendente");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status,
          processedAt: new Date(),
          failureReason: failureReason ?? null,
        },
      });

      // Se falhou, devolve saldo ao criador
      if (status === "FAILED") {
        await tx.creatorBalance.update({
          where: { creatorId: withdrawal.creatorId },
          data: {
            availableAmount: { increment: withdrawal.amount },
            pendingAmount:   { decrement: withdrawal.amount },
          },
        });
      } else {
        // Concluído: remove do saldo pendente
        await tx.creatorBalance.update({
          where: { creatorId: withdrawal.creatorId },
          data: { pendingAmount: { decrement: withdrawal.amount } },
        });
      }
    });

    this.logger.log(`Admin ${adminId} processou saque ${withdrawalId}: ${status}`);
    return { message: `Saque marcado como ${status}` };
  }

  // ─── Denúncias ────────────────────────────────────────────

  async listReports(opts: { page: number; limit: number; status?: string }) {
    const { page, limit, status } = opts;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    else where.status = "PENDING";

    const [items, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        skip, take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, contentId: true, reason: true, status: true,
          createdAt: true, resolvedAt: true,
          reportedUserId: true,
          reporter:     { select: { username: true } },
          reportedUser: { select: { username: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      items: items.map((r) => ({
        id:               r.id,
        contentId:        r.contentId,
        reportedUserId:   r.reportedUserId,
        reporterUsername: r.reporter?.username ?? "",
        reportedUsername: r.reportedUser?.username ?? null,
        reason:           r.reason,
        status:           r.status,
        createdAt:        r.createdAt,
        resolvedAt:       r.resolvedAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async resolveReport(reportId: string, adminId: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException("Denúncia não encontrada");
    if (report.status === "RESOLVED") throw new BadRequestException("Denúncia já resolvida");

    await this.prisma.report.update({
      where: { id: reportId },
      data: { status: "RESOLVED", resolvedAt: new Date(), resolvedById: adminId },
    });

    this.logger.log(`Admin ${adminId} resolveu denúncia ${reportId}`);
    return { message: "Denúncia marcada como resolvida" };
  }

  async listContent(opts: { page: number; limit: number; status?: string }) {
    const { page, limit, status } = opts;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    else where.status = "PENDING_REVIEW";

    const [items, total] = await this.prisma.$transaction([
      this.prisma.media.findMany({
        where,
        skip, take: limit,
        orderBy: { createdAt: "asc" },
        select: {
          id: true, creatorId: true, type: true, status: true, mimeType: true,
          thumbnailUrl: true, title: true, createdAt: true,
          creator: { select: { username: true, profile: { select: { artisticName: true } } } },
        },
      }),
      this.prisma.media.count({ where }),
    ]);

    return {
      items: items.map((m) => ({
        ...m,
        artisticName: m.creator?.profile?.artisticName ?? m.creator?.username ?? "",
        username:     m.creator?.username ?? "",
        creator:      undefined,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async moderateContent(mediaId: string, action: "APPROVED" | "REJECTED", adminId: string, reason?: string) {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new NotFoundException("Conteúdo não encontrado");

    await this.prisma.$transaction([
      this.prisma.media.update({
        where: { id: mediaId },
        data: { status: action },
      }),
      this.prisma.moderationLog.create({
        data: {
          contentId:   mediaId,
          contentType: media.type === "PHOTO" ? "photo" : "video",
          action,
          moderatorId: adminId,
          reason:      reason ?? `Revisão manual pelo admin ${adminId}`,
        },
      }),
    ]);

    this.logger.log(`Admin ${adminId} ${action} conteúdo ${mediaId}`);
    return { message: `Conteúdo ${action === "APPROVED" ? "aprovado" : "rejeitado"}` };
  }
}
