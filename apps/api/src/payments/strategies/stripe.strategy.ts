import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ChargeInput, ChargeResult, WebhookEvent } from "./pagarme.strategy";

@Injectable()
export class StripeStrategy {
  private readonly logger = new Logger(StripeStrategy.name);
  private readonly secretKey: string;

  constructor(private config: ConfigService) {
    this.secretKey = this.config.get("app.stripe.secretKey") ?? "";
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    if (!this.secretKey || process.env.NODE_ENV !== "production") {
      this.logger.warn("[MOCK] Stripe: simulando cobrança aprovada");
      return {
        id: `mock_stripe_${Date.now()}`,
        status: "paid",
        raw: { mock: true, amount: input.amount },
      };
    }

    const response = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${this.secretKey}`,
      },
      body: new URLSearchParams({
        amount: String(input.amount),
        currency: input.currency.toLowerCase(),
        payment_method: input.token,
        confirm: "true",
        description: input.description,
      }),
    });

    const data: any = await response.json();

    return {
      id: data.id,
      status: data.status === "succeeded" ? "paid" : data.status === "requires_action" ? "pending" : "failed",
      raw: data,
    };
  }

  async parseWebhook(payload: any, signature: string): Promise<WebhookEvent> {
    // TODO produção: verificar assinatura com stripe.webhooks.constructEvent
    const typeMap: Record<string, WebhookEvent["type"]> = {
      "payment_intent.succeeded": "payment.paid",
      "payment_intent.payment_failed": "payment.failed",
      "charge.refunded": "payment.refunded",
      "charge.dispute.created": "chargeback",
    };

    return {
      type: typeMap[payload.type] ?? "payment.failed",
      gatewayTxId: payload.data?.object?.id ?? "",
      reason: payload.data?.object?.last_payment_error?.message,
      raw: payload,
    };
  }
}
