import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis(this.config.get<string>("app.redis.url")!, {
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.client.on("connect", () => this.logger.log("Conectado ao Redis"));
    this.client.on("error", (err) => this.logger.error("Erro Redis:", err));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // ─── Refresh tokens ──────────────────────────────────────

  async setRefreshToken(userId: string, sessionId: string, ttlSeconds: number) {
    await this.client.setex(`refresh:${userId}:${sessionId}`, ttlSeconds, "1");
  }

  async isRefreshTokenValid(userId: string, sessionId: string): Promise<boolean> {
    const exists = await this.client.exists(`refresh:${userId}:${sessionId}`);
    return exists === 1;
  }

  async revokeRefreshToken(userId: string, sessionId: string) {
    await this.client.del(`refresh:${userId}:${sessionId}`);
  }

  async revokeAllUserSessions(userId: string) {
    const keys = await this.client.keys(`refresh:${userId}:*`);
    if (keys.length > 0) await this.client.del(...keys);
  }

  // ─── Blacklist de access tokens (logout) ─────────────────

  async blacklistAccessToken(jti: string, ttlSeconds: number) {
    await this.client.setex(`blacklist:${jti}`, ttlSeconds, "1");
  }

  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    return (await this.client.exists(`blacklist:${jti}`)) === 1;
  }

  // ─── Rate limiting de tentativas de login ────────────────

  async incrementLoginAttempts(identifier: string): Promise<number> {
    const key = `login_attempts:${identifier}`;
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, 900); // 15 min
    return count;
  }

  async resetLoginAttempts(identifier: string) {
    await this.client.del(`login_attempts:${identifier}`);
  }

  async getLoginAttempts(identifier: string): Promise<number> {
    const val = await this.client.get(`login_attempts:${identifier}`);
    return val ? parseInt(val, 10) : 0;
  }

  // ─── Cache genérico ──────────────────────────────────────

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string) {
    await this.client.del(key);
  }
}
