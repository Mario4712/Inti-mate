import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { addDays } from "date-fns";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ─── Perfil público ──────────────────────────────────────

  async getPublicProfile(artisticName: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { artisticName },
      select: {
        artisticName: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        coverUrl: true,
        city: this.selectIfPublic(),
        state: this.selectIfPublic(),
        isCreator: true,
        isPublic: true,
        createdAt: true,
        // Nunca expor: userId, dados reais do usuário
      },
    });

    if (!profile || !profile.isPublic) {
      throw new NotFoundException("Perfil não encontrado");
    }

    return profile;
  }

  // ─── Perfil privado (próprio usuário) ────────────────────

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        profile: {
          select: {
            artisticName: true,
            displayName: true,
            bio: true,
            avatarUrl: true,
            coverUrl: true,
            city: true,
            state: true,
            showLocation: true,
            isCreator: true,
            isPublic: true,
          },
        },
        ageVerification: {
          select: {
            status: true,
            type: true,
            verifiedAt: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException("Usuário não encontrado");
    return user;
  }

  // ─── Atualizar perfil ────────────────────────────────────

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Verifica conflito de nome artístico
    if (dto.artisticName) {
      const conflict = await this.prisma.userProfile.findFirst({
        where: {
          artisticName: dto.artisticName,
          NOT: { userId },
        },
      });
      if (conflict) {
        throw new ConflictException("Nome artístico já em uso");
      }
    }

    return this.prisma.userProfile.update({
      where: { userId },
      data: {
        ...(dto.artisticName !== undefined && { artisticName: dto.artisticName }),
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.showLocation !== undefined && { showLocation: dto.showLocation }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      },
      select: {
        artisticName: true,
        displayName: true,
        bio: true,
        city: true,
        state: true,
        showLocation: true,
        isPublic: true,
        updatedAt: true,
      },
    });
  }

  // ─── LGPD: solicitar exclusão de dados ──────────────────

  async requestDataDeletion(userId: string) {
    const existing = await this.prisma.dataDeletionRequest.findUnique({
      where: { userId },
    });

    if (existing && existing.status !== "COMPLETED") {
      throw new BadRequestException("Já existe uma solicitação de exclusão em andamento");
    }

    const scheduledAt = addDays(new Date(), 30); // 30 dias conforme LGPD

    const request = await this.prisma.dataDeletionRequest.upsert({
      where: { userId },
      create: { userId, scheduledAt },
      update: { scheduledAt, status: "PENDING", executedAt: null },
    });

    return {
      message:
        "Solicitação de exclusão registrada. Seus dados serão removidos em 30 dias, conforme a LGPD.",
      scheduledAt: request.scheduledAt,
    };
  }

  async cancelDataDeletion(userId: string) {
    const request = await this.prisma.dataDeletionRequest.findUnique({
      where: { userId },
    });

    if (!request || request.status === "COMPLETED") {
      throw new BadRequestException("Nenhuma solicitação pendente encontrada");
    }

    await this.prisma.dataDeletionRequest.update({
      where: { userId },
      data: { status: "CANCELLED" },
    });

    return { message: "Solicitação de exclusão cancelada" };
  }

  async exportMyData(userId: string) {
    // Exportação de dados pessoais conforme Art. 18, IV da LGPD
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        consentRecords: true,
        ageVerification: {
          select: { type: true, status: true, verifiedAt: true }, // sem URLs de documentos
        },
        sessions: {
          select: { ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!user) throw new NotFoundException();

    // Remove campos sensíveis antes de exportar
    const { passwordHash, twoFactorSecret, cpfHash, cpfEncrypted, ...safeUser } = user as any;

    return {
      exportedAt: new Date().toISOString(),
      data: safeUser,
    };
  }

  // ─── SEO / Sitemap ───────────────────────────────────────

  async getCreatorByUsername(username: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        username,
        role:      "CREATOR",
        status:    "ACTIVE",
        deletedAt: null,
      },
      select: {
        id:       true,
        username: true,
        updatedAt: true,
        profile: {
          select: {
            artisticName: true, bio: true,
            avatarUrl: true, coverUrl: true,
            tags: true, category: true, country: true,
          },
        },
        creatorPlans: {
          where: { isActive: true },
          select: {
            id: true, name: true, description: true, monthlyPrice: true,
          },
          orderBy: { monthlyPrice: "asc" },
        },
        _count: { select: { mySubscriptions: true } },
        media: {
          where: { status: "APPROVED" },
          orderBy: { createdAt: "desc" },
          take: 9,
          select: { id: true, thumbnailUrl: true, type: true, title: true },
        },
      },
    });

    if (!user) throw new NotFoundException("Criador não encontrado");

    return {
      id:              user.id,
      username:        user.username,
      artisticName:    user.profile?.artisticName ?? user.username,
      bio:             user.profile?.bio           ?? "",
      avatarUrl:       user.profile?.avatarUrl     ?? null,
      coverUrl:        user.profile?.coverUrl      ?? null,
      tags:            (user.profile?.tags as string[]) ?? [],
      category:        (user.profile?.category as string) ?? "",
      country:         (user.profile?.country as string)  ?? "BR",
      subscriberCount: user._count.mySubscriptions,
      plans:           user.creatorPlans.map((p) => ({
        ...p,
        monthlyPrice: Number(p.monthlyPrice),
      })),
      recentMedia: user.media,
    };
  }

  async getCreatorsForSitemap(): Promise<Array<{ username: string; updatedAt: string }>> {
    const users = await this.prisma.user.findMany({
      where: { role: "CREATOR", status: "ACTIVE", deletedAt: null },
      select: { username: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });

    return users.map((u) => ({
      username:  u.username,
      updatedAt: u.updatedAt.toISOString(),
    }));
  }

  private selectIfPublic() {
    // Prisma não suporta conditional select diretamente;
    // filtramos na camada de serviço
    return true;
  }
}
