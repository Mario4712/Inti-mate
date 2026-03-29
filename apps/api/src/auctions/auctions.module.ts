import { Module } from "@nestjs/common";
import { AuctionsController } from "./auctions.controller";
import { AuctionsService } from "./auctions.service";
import { ContentModule } from "../content/content.module";

@Module({
  imports: [ContentModule],
  controllers: [AuctionsController],
  providers: [AuctionsService],
})
export class AuctionsModule {}
