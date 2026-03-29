import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../common/database/prisma.service";

const PLATFORM_FEE = 0.20;

// Texto de consentimento exibido ao criador antes de cada sessão
const CONSENT_TEXT = `
Ao ativar o controle remoto, você consente que assinantes pagantes possam controlar
o dispositivo dentro dos limites de intensidade que você configurou abaixo.
Este consentimento é válido apenas para esta sessão e pode ser revogado a qualquer
momento encerrando a sessão.
`.trim();

@Injectable()
export class ToysService {
  private readonly logger = new Logger(ToysService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Criador: iniciar sessão ──────────────────────────────

  async startSession(
    creatorId: string,
    config: {
      liveId?:      string;
      minIntensity?: number;
      maxIntensity?: number;
      pricePerMin:  number;  // centavos
      minPayBRL?:   number;  // centavos, default 500 (R$5)
    },
  ) {
    // Apenas 1 sessão ativa por criador
    const existing = await this.prisma.toySession.findFirst({
      where: { creatorId, status: "ACTIVE" },
    });
    if (existing) throw new BadRequestException("Já existe uma sessão de toy ativa");

    const maxIntensity = config.maxIntensity ?? 50;
    if (maxIntensity > 100 || maxIntensity < 0) {
      throw new BadRequestException("Intensidade deve estar entre 0 e 100");
    }
    if (config.pricePerMin < 10) {
      throw new BadRequestException("Preço mínimo por minuto é R$ 0,10");
    }

    const session = await this.prisma.toySession.create({
      data: {
        creatorId,
        liveId:       config.liveId      ?? null,
        consentText:  CONSENT_TEXT,
        minIntensity: config.minIntensity ?? 0,
        maxIntensity,
        pricePerMin:  config.pricePerMin,
        minPayBRL:    config.minPayBRL    ?? 500,
      },
    });

    this.logger.log(`ToySession iniciada: ${session.id} por criador ${creatorId}`);
    return {
      sessionId:    session.id,
      consentText:  session.consentText,
      maxIntensity: session.maxIntensity,
      pricePerMin:  session.pricePerMin,
    };
  }

  // ─── Encerrar sessão ──────────────────────────────────────

  async endSession(creatorId: string, sessionId: string) {
    const session = await this.prisma.toySession.findFirst({
      where: { id: sessionId, creatorId, status: "ACTIVE" },
    });
    if (!session) throw new NotFoundException("Sessão não encontrada");

    await this.prisma.toySession.update({
      where: { id: sessionId },
      data:  { status: "ENDED", endedAt: new Date() },
    });

    return { ended: true };
  }

  // ─── Fã: pagar por controle ───────────────────────────────

  async purchaseControl(
    userId:     string,
    sessionId:  string,
    durationSec: number,
    intensity:  number,
  ) {
    const session = await this.prisma.toySession.findFirst({
      where: { id: sessionId, status: "ACTIVE" },
    });
    if (!session) throw new NotFoundException("Sessão de controle não está ativa");

    if (userId === session.creatorId) {
      throw new ForbiddenException("Criador não pode controlar o próprio dispositivo como fã");
    }

    // Validar intensidade dentro do cap do criador
    const clampedIntensity = Math.min(
      Math.max(intensity, session.minIntensity),
      session.maxIntensity,
    );

    // Calcular custo: pricePerMin × (durationSec / 60)
    const durationMin = Math.ceil(durationSec / 60);
    const totalCents  = durationMin * session.pricePerMin;

    if (totalCents < session.minPayBRL) {
      throw new BadRequestException(
        `Valor mínimo por ativação é R$ ${(session.minPayBRL / 100).toFixed(2)}`,
      );
    }

    const netCents = Math.round(totalCents * (1 - PLATFORM_FEE));
    const endsAt   = new Date(Date.now() + durationSec * 1000);

    const control = await this.prisma.$transaction(async (tx) => {
      const c = await tx.toyControl.create({
        data: {
          sessionId,
          userId,
          durationSec,
          intensity: clampedIntensity,
          amountPaid: totalCents,
          netAmount:  netCents,
          endsAt,
        },
      });

      // Crédita criador
      await tx.creatorBalance.upsert({
        where:  { creatorId: session.creatorId },
        create: { creatorId: session.creatorId, availableAmount: netCents, pendingAmount: 0, totalEarned: netCents },
        update: { availableAmount: { increment: netCents }, totalEarned: { increment: netCents } },
      });

      return c;
    });

    return {
      controlId:   control.id,
      intensity:   clampedIntensity,
      durationSec,
      amountPaid:  totalCents,
      endsAt:      control.endsAt,
      // Instrução para o frontend enviar via WebSocket para o device do criador
      command: { sessionId, intensity: clampedIntensity, durationSec },
    };
  }

  // ─── Status da sessão ativa ───────────────────────────────

  async getActiveSession(creatorId: string) {
    const session = await this.prisma.toySession.findFirst({
      where: { creatorId, status: "ACTIVE" },
      include: {
        controls: {
          where: { endsAt: { gte: new Date() } },
          orderBy: { endsAt: "desc" },
          take: 1,
          select: { intensity: true, endsAt: true, userId: true },
        },
      },
    });

    if (!session) return { active: false };

    return {
      active:       true,
      sessionId:    session.id,
      maxIntensity: session.maxIntensity,
      pricePerMin:  session.pricePerMin,
      currentControl: session.controls[0] ?? null,
    };
  }

  async getPublicSessionInfo(sessionId: string) {
    const session = await this.prisma.toySession.findFirst({
      where: { id: sessionId, status: "ACTIVE" },
      select: {
        id: true, maxIntensity: true, pricePerMin: true, minPayBRL: true,
      },
    });
    if (!session) throw new NotFoundException("Sessão não encontrada ou inativa");
    return session;
  }
}
