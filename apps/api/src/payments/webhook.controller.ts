import {
  Body,
  Controller,
  Headers,
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
  async handleWebhook(
    @Param("provider") provider: string,
    @Body() payload: any,
    @Headers("x-pagarme-signature") pagarmeSignature: string,
    @Headers("stripe-signature") stripeSignature: string,
  ) {
    const signature = pagarmeSignature ?? stripeSignature ?? "";
    await this.paymentsService.handleWebhook(provider, payload, signature);
    return { received: true };
  }
}
