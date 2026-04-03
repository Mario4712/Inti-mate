import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

export type AuditAction =
  | "PAYMENT_RECEIVED"
  | "PAYMENT_REFUNDED"
  | "WITHDRAWAL_REQUESTED"
  | "WITHDRAWAL_PROCESSED"
  | "WITHDRAWAL_FAILED"
  | "SUBSCRIPTION_CREATED"
  | "SUBSCRIPTION_CANCELLED"
  | "BALANCE_CREDITED"
  | "BALANCE_DEBITED"
  | "KYC_SUBMITTED"
  | "KYC_APPROVED"
  | "KYC_REJECTED"
  | "USER_DELETED"
  | "ADMIN_ACTION";

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(params: {
    action: AuditAction;
    userId: string;
    targetId?: string;
    targetType?: string;
    metadata?: Record<string, any>;
    ip?: string;
  }) {
    try {
      const entry = {
        type: "AUDIT" as const,
        action: params.action,
        userId: params.userId,
        targetId: params.targetId ?? null,
        targetType: params.targetType ?? null,
        metadata: params.metadata ?? {},
        ip: params.ip ?? null,
        timestamp: new Date().toISOString(),
      };

      // Structured log for aggregation (Datadog, CloudWatch, etc.)
      this.logger.log(JSON.stringify(entry));

      // Persist to database via moderationLog (uses APPROVED as generic action)
      await this.prisma.moderationLog.create({
        data: {
          contentId: params.targetId ?? params.userId,
          contentType: params.targetType ?? "SYSTEM",
          action: "APPROVED",
          moderatorId: params.userId,
          reason: JSON.stringify({
            auditAction: params.action,
            ...params.metadata,
          }),
        },
      });
    } catch (err) {
      // Audit logging should never break the main flow
      this.logger.error("Failed to write audit log", err);
    }
  }
}
