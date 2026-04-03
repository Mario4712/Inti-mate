import { Module } from "@nestjs/common";
import { WithdrawalsController } from "./withdrawals.controller";
import { WithdrawalsService } from "./withdrawals.service";
import { PagarmeStrategy } from "../payments/strategies/pagarme.strategy";

@Module({
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService, PagarmeStrategy],
  exports: [WithdrawalsService],
})
export class WithdrawalsModule {}
