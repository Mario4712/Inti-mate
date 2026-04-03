import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

export interface ChargeInput {
  amount: number;
  currency: string;
  token: string;
  description: string;
  metadata?: Record<string, string>;
}

export interface ChargeResult {
  id: string;
  status: "paid" | "pending" | "failed";
  raw: any;
}

export interface WebhookEvent {
  type: "payment.paid" | "payment.failed" | "payment.refunded" | "chargeback";
  gatewayTxId: string;
  reason?: string;
  raw: any;
}

@Injectable()
export class PagarmeStrategy {
  private readonly logger = new Logger(PagarmeStrategy.name);
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly baseUrl = "https://api.pagar.me/core/v5";

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get("app.pagarme.apiKey") ?? "";
    this.webhookSecret = this.config.get("app.pagarme.webhookSecret") ?? "";
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    // Mock em desenvolvimento — substitua por chamada real ao Pagar.me v5
    if (!this.apiKey || process.env.NODE_ENV !== "production") {
      this.logger.warn("[MOCK] Pagar.me: simulando cobrança aprovada");
      return {
        id: `mock_pagarme_${Date.now()}`,
        status: "paid",
        raw: { mock: true, amount: input.amount },
      };
    }

    const response = await fetch(`${this.baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
      },
      body: JSON.stringify({
        items: [{ amount: input.amount, description: input.description, quantity: 1 }],
        payments: [
          {
            payment_method: "credit_card",
            credit_card: {
              card_token: input.token,
              installments: 1,
              statement_descriptor: "INTIMARE",
            },
          },
        ],
        metadata: input.metadata,
      }),
    });

    const data: any = await response.json();

    return {
      id: data.id,
      status: data.status === "paid" ? "paid" : data.status === "pending" ? "pending" : "failed",
      raw: data,
    };
  }

  async parseWebhook(payload: any, signature: string): Promise<WebhookEvent> {
    // Valida assinatura HMAC SHA-256 do Pagar.me
    if (this.webhookSecret && process.env.NODE_ENV === "production") {
      const body = typeof payload === "string" ? payload : JSON.stringify(payload);
      const expected = crypto
        .createHmac("sha256", this.webhookSecret)
        .update(body)
        .digest("hex");

      if (!signature || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
        this.logger.warn("Webhook Pagar.me: assinatura HMAC inválida");
        throw new UnauthorizedException("Assinatura de webhook inválida");
      }
    }

    const type = payload.type as string;

    const typeMap: Record<string, WebhookEvent["type"]> = {
      "order.paid": "payment.paid",
      "order.payment_failed": "payment.failed",
      "order.refunded": "payment.refunded",
      "charge.chargeback_created": "chargeback",
    };

    return {
      type: typeMap[type] ?? "payment.failed",
      gatewayTxId: payload.data?.id ?? "",
      reason: payload.data?.last_transaction?.gateway_response?.errors?.[0]?.message,
      raw: payload,
    };
  }

  async createPixCharge(amount: number, description: string): Promise<{ qrCode: string; txId: string }> {
    if (!this.apiKey || process.env.NODE_ENV !== "production") {
      return {
        qrCode: "00020126580014BR.GOV.BCB.PIX0136mock-uuid-pix-qr-code",
        txId: `mock_pix_${Date.now()}`,
      };
    }

    const response = await fetch(`${this.baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
      },
      body: JSON.stringify({
        items: [{ amount, description, quantity: 1 }],
        payments: [{ payment_method: "pix" }],
      }),
    });

    const data: any = await response.json();
    const pixTx = data.charges?.[0]?.last_transaction;

    return {
      qrCode: pixTx?.qr_code ?? "",
      txId: data.id,
    };
  }

  /**
   * Transferência PIX para conta do criador (saque).
   * Usa API de transferências do Pagar.me v5.
   */
  async createPixTransfer(params: {
    amountCents: number;
    pixKey: string;
    pixKeyType: "cpf" | "email" | "phone" | "random_key";
    description: string;
    metadata?: Record<string, string>;
  }): Promise<{ id: string; status: string }> {
    if (!this.apiKey || process.env.NODE_ENV !== "production") {
      this.logger.warn("[MOCK] Pagar.me: simulando transferência PIX aprovada");
      return { id: `mock_transfer_${Date.now()}`, status: "transferred" };
    }

    const response = await fetch(`${this.baseUrl}/transfers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
      },
      body: JSON.stringify({
        amount: params.amountCents,
        type: "pix",
        pix: {
          key: params.pixKey,
          key_type: params.pixKeyType,
        },
        metadata: params.metadata,
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      this.logger.error(`Pagar.me transfer error: ${JSON.stringify(data)}`);
      throw new Error(data.message ?? "Erro ao processar transferência PIX");
    }

    return { id: data.id, status: data.status };
  }
}
