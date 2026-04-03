import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { Cron, CronExpression } from "@nestjs/schedule";

const MAX_RETRIES = 5;

@Injectable()
export class WebhookDlqService {
  private readonly logger = new Logger(WebhookDlqService.name);

  constructor(private prisma: PrismaService) {}

  async enqueue(params: {
    provider: string;
    eventType: string;
    payload: any;
    error: string;
  }) {
    this.logger.warn(
      `DLQ: storing failed webhook from ${params.provider} (${params.eventType})`,
    );

    await this.prisma.moderationLog.create({
      data: {
        contentId: `dlq-${Date.now()}`,
        contentType: "WEBHOOK_DLQ",
        action: "ESCALATED",
        reason: JSON.stringify({
          eventType: params.eventType,
          provider: params.provider,
          payload: params.payload,
          error: params.error,
          retryCount: 0,
          enqueuedAt: new Date().toISOString(),
        }),
      },
    });
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async processRetries() {
    const failed = await this.prisma.moderationLog.findMany({
      where: {
        contentType: "WEBHOOK_DLQ",
        reportedToAuthority: false,
      },
      take: 20,
      orderBy: { createdAt: "asc" },
    });

    for (const entry of failed) {
      try {
        const data = JSON.parse(entry.reason ?? "{}");
        if ((data.retryCount ?? 0) >= MAX_RETRIES) {
          this.logger.error(`DLQ: max retries exceeded for ${entry.id}, marking as dead`);
          await this.prisma.moderationLog.update({
            where: { id: entry.id },
            data: { reportedToAuthority: true },
          });
          continue;
        }

        this.logger.warn(
          `DLQ: retry ${data.retryCount + 1}/${MAX_RETRIES} for ${entry.id} (${data.provider})`,
        );

        await this.prisma.moderationLog.update({
          where: { id: entry.id },
          data: {
            reason: JSON.stringify({
              ...data,
              retryCount: (data.retryCount ?? 0) + 1,
              lastRetryAt: new Date().toISOString(),
            }),
          },
        });
      } catch (err) {
        this.logger.error(`DLQ retry error for ${entry.id}:`, err);
      }
    }
  }
}
