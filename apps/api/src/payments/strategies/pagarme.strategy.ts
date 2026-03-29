import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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
  private readonly baseUrl = "https://api.pagar.me/core/v5";

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get("app.pagarme.apiKey") ?? "";
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
    // TODO produção: validar assinatura HMAC do Pagar.me
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
}
