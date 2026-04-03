import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaService } from "../database/prisma.service";
import { RedisService } from "../redis/redis.service";

@Controller("health")
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  getHealth() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get("ready")
  async getReadiness() {
    const services: Record<string, string> = {
      database: "down",
      redis: "down",
    };

    // Check database connectivity
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      services.database = "up";
    } catch {
      services.database = "down";
    }

    // Check Redis connectivity
    try {
      await this.redis.get("health:check");
      services.redis = "up";
    } catch {
      services.redis = "down";
    }

    const allUp = Object.values(services).every((s) => s === "up");

    if (!allUp) {
      throw new HttpException(
        { status: "error", services },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return { status: "ok", services };
  }
}
