import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/database/prisma.service";
import { RedisService } from "../../common/redis/redis.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("app.jwt.accessSecret"),
    });
  }

  async validate(payload: { sub: string; role: string; jti: string; sessionId: string }) {
    // Verifica se o token foi blacklistado (logout)
    if (payload.jti) {
      const blacklisted = await this.redis.isAccessTokenBlacklisted(payload.jti);
      if (blacklisted) throw new UnauthorizedException("Token revogado");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        twoFactorEnabled: true,
        profile: {
          select: {
            artisticName: true,
            displayName: true,
            avatarUrl: true,
            isCreator: true,
          },
        },
      },
    });

    if (!user || user.status === "BANNED") {
      throw new UnauthorizedException();
    }

    return { ...user, jti: payload.jti, sessionId: payload.sessionId };
  }
}
