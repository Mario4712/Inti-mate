import { Module } from "@nestjs/common";
import { CryptoPaymentsController } from "./crypto-payments.controller";
import { CryptoPaymentsService } from "./crypto-payments.service";

@Module({
  controllers: [CryptoPaymentsController],
  providers:   [CryptoPaymentsService],
  exports:     [CryptoPaymentsService],
})
export class CryptoPaymentsModule {}
