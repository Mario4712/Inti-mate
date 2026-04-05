import { Module } from "@nestjs/common";
import { AuctionsController } from "./auctions.controller";
import { AuctionsService } from "./auctions.service";
import { ContentModule } from "../content/content.module";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [ContentModule, PaymentsModule],
  controllers: [AuctionsController],
  providers: [AuctionsService],
})
export class AuctionsModule {}
