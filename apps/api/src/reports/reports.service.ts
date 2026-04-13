import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async createReport(
    reporterId: string,
    dto: { reportedUserId?: string; contentId?: string; reason: string },
  ) {
    if (!dto.reportedUserId && !dto.contentId) {
      throw new BadRequestException("Informe o usuário ou conteúdo denunciado");
    }

    if (dto.reportedUserId === reporterId) {
      throw new BadRequestException("Você não pode denunciar a si mesmo");
    }

    // Evitar denúncias duplicadas pendentes
    const existing = await this.prisma.report.findFirst({
      where: {
        reporterId,
        reportedUserId: dto.reportedUserId ?? null,
        contentId:      dto.contentId      ?? null,
        status:         "PENDING",
      },
    });
    if (existing) {
      throw new BadRequestException("Você já possui uma denúncia pendente para este alvo");
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reportedUserId: dto.reportedUserId ?? null,
        contentId:      dto.contentId      ?? null,
        reason:         dto.reason,
      },
    });

    return { id: report.id, message: "Denúncia registrada com sucesso" };
  }
}
