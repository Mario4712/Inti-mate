import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../common/database/prisma.service";

/**
 * Item 44 — Matches por região
 *
 * Privacidade by design:
 * - Opt-in explícito com texto claro antes de salvar
 * - Armazenamos APENAS cidade e estado (nunca coordenadas GPS)
 * - Retenção máxima: 30 dias — @Cron purga registros expirados
 * - Usuário pode remover a localização a qualquer momento
 * - Endpoint "criadores perto de você" filtra por estado (não por cidade exacta)
 *   para evitar triangulação de posição
 *
 * LGPD: cidade/estado são dados pessoais — tratados com base no
 * consentimento explícito registrado em ConsentRecord.
 */

const RETENTION_DAYS = 30;

const STATES_BR = new Set([
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
]);

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Opt-in ──────────────────────────────────────────────

  /**
   * Salva ou atualiza a localização do usuário.
   * Registra consentimento explícito em ConsentRecord.
   */
  async setLocation(
    userId: string,
    city:   string,
    state:  string,
  ) {
    const s = state.trim().toUpperCase();
    if (!STATES_BR.has(s)) {
      throw new BadRequestException(`Estado inválido: ${state}. Use a sigla (ex: SP, RJ)`);
    }
    if (!city || city.trim().length < 2) {
      throw new BadRequestException("Cidade inválida");
    }

    const expiresAt = new Date(Date.now() + RETENTION_DAYS * 86_400_000);

    const [location] = await this.prisma.$transaction([
      this.prisma.userLocation.upsert({
        where:  { userId },
        create: { userId, city: city.trim(), state: s, expiresAt },
        update: { city: city.trim(), state: s, optedInAt: new Date(), expiresAt },
      }),
      // Registra consentimento explícito (LGPD Art. 7 I)
      this.prisma.consentRecord.create({
        data: {
          userId,
          type:     "DATA_PROCESSING",  // ConsentType enum — processamento de localização
          version:  "location-v1",
          accepted: true,               // campo obrigatório no schema
        },
      }),
    ]);

    return location;
  }

  async getMyLocation(userId: string) {
    return this.prisma.userLocation.findUnique({ where: { userId } });
  }

  // ─── Opt-out ─────────────────────────────────────────────

  async removeLocation(userId: string) {
    await this.prisma.userLocation.deleteMany({ where: { userId } });
    return { ok: true };
  }

  // ─── Descoberta por região ───────────────────────────────

  /**
   * Retorna criadores no mesmo estado.
   * Filtro por estado (não cidade) para privacidade.
   */
  async getCreatorsNearby(
    viewerUserId: string,
    limit = 20,
  ) {
    const myLocation = await this.prisma.userLocation.findUnique({
      where: { userId: viewerUserId },
    });

    if (!myLocation || myLocation.expiresAt < new Date()) {
      throw new NotFoundException(
        "Localização não definida ou expirada. Ative em Configurações > Localização.",
      );
    }

    // Criadores no mesmo estado com localização ativa
    const nearbyLocations = await this.prisma.userLocation.findMany({
      where: {
        state:     myLocation.state,
        userId:    { not: viewerUserId },
        expiresAt: { gte: new Date() },
        user:      { role: "CREATOR", status: "ACTIVE" },
      },
      take: limit,
    });

    if (nearbyLocations.length === 0) return [];

    const creatorIds = nearbyLocations.map((l) => l.userId);
    const profiles   = await this.prisma.userProfile.findMany({
      where:  { userId: { in: creatorIds } },
      select: {
        userId: true, artisticName: true, avatarUrl: true,
        category: true, state: true,
      },
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    return nearbyLocations
      .map((l) => ({
        creatorId:    l.userId,
        artisticName: profileMap.get(l.userId)?.artisticName ?? null,
        avatarUrl:    profileMap.get(l.userId)?.avatarUrl    ?? null,
        category:     profileMap.get(l.userId)?.category     ?? null,
        state:        l.state, // expomos estado, não cidade (privacidade)
      }))
      .filter((c) => c.artisticName !== null);
  }

  // ─── Purge automático (retenção 30 dias) ─────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeExpiredLocations() {
    const result = await this.prisma.userLocation.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    if (result.count > 0) {
      this.logger.log(`Purged ${result.count} expired user locations`);
    }
  }
}
