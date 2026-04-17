import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import type { ChargeInput, ChargeResult, WebhookEvent } from "./pagarme.strategy";

@Injectable()
export class StripeStrategy {
  private readonly logger = new Logger(StripeStrategy.name);
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(private config: ConfigService) {
    this.secretKey = this.config.get("app.stripe.secretKey") ?? "";
    this.webhookSecret = this.config.get("app.stripe.webhookSecret") ?? "";
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
    // Valida assinatura Stripe Webhook em todos os ambientes quando secret configurado
    if (this.webhookSecret) {
      this.verifyStripeSignature(payload, signature);
    }

    // Parse JSON if raw buffer was passed
    const data = Buffer.isBuffer(payload) ? JSON.parse(payload.toString()) : payload;

    const typeMap: Record<string, WebhookEvent["type"]> = {
      "payment_intent.succeeded": "payment.paid",
      "payment_intent.payment_failed": "payment.failed",
      "charge.refunded": "payment.refunded",
      "charge.dispute.created": "chargeback",
    };

    return {
      type: typeMap[data.type] ?? "payment.failed",
      gatewayTxId: data.data?.object?.id ?? "",
      reason: data.data?.object?.last_payment_error?.message,
      raw: data,
    };
  }

  private verifyStripeSignature(payload: any, signatureHeader: string) {
    if (!signatureHeader) {
      throw new UnauthorizedException("Stripe webhook: header de assinatura ausente");
    }

    const body = Buffer.isBuffer(payload)
      ? payload
      : Buffer.from(typeof payload === "string" ? payload : JSON.stringify(payload));

    // Parse Stripe-Signature: t=timestamp,v1=signature
    const elements = signatureHeader.split(",").reduce((acc: Record<string, string>, item) => {
      const [key, value] = item.split("=");
      if (key && value) acc[key.trim()] = value.trim();
      return acc;
    }, {});

    const timestamp = elements["t"];
    const v1 = elements["v1"];

    if (!timestamp || !v1) {
      throw new UnauthorizedException("Stripe webhook: formato de assinatura inválido");
    }

    // Reject timestamps older than 5 minutes (replay protection)
    const tolerance = 300;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > tolerance) {
      throw new UnauthorizedException("Stripe webhook: timestamp fora da tolerância");
    }

    const signedPayload = Buffer.concat([
      Buffer.from(`${timestamp}.`),
      Buffer.isBuffer(body) ? body : Buffer.from(body),
    ]);
    const expected = crypto.createHmac("sha256", this.webhookSecret).update(signedPayload).digest("hex");

    if (v1.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))) {
      throw new UnauthorizedException("Stripe webhook: assinatura inválida");
    }
  }
}
