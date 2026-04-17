import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";

@ApiExcludeController()
@Controller({ path: "webhooks", version: "1" })
export class WebhookController {
  constructor(private paymentsService: PaymentsService) {}

  @Post(":provider")
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param("provider") provider: string,
    @Req() req: RawBodyRequest<any>,
    @Body() body: any,
    @Headers("x-pagarme-signature") pagarmeSignature?: string,
    @Headers("stripe-signature") stripeSignature?: string,
  ) {
    // Pass raw body (Buffer) to strategies for HMAC validation — avoids
    // JSON re-serialization differences that break signature checks.
    const rawBody: Buffer | undefined = req.rawBody;
    const payload = rawBody ?? body;
    const signature = pagarmeSignature ?? stripeSignature ?? "";

    await this.paymentsService.handleWebhook(provider, payload, signature);
    return { received: true };
  }
}
