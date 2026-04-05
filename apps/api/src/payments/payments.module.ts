import { Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PpvService } from "./ppv.service";
import { PpvController } from "./ppv.controller";
import { PagarmeStrategy } from "./strategies/pagarme.strategy";
import { StripeStrategy } from "./strategies/stripe.strategy";
import { WebhookController } from "./webhook.controller";

@Module({
  controllers: [WebhookController, PpvController],
  providers: [PaymentsService, PpvService, PagarmeStrategy, StripeStrategy],
  exports: [PaymentsService, PpvService, PagarmeStrategy],
})
export class PaymentsModule {}
