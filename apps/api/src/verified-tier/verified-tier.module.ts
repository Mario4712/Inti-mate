import { Module } from "@nestjs/common";
import { VerifiedTierController } from "./verified-tier.controller";
import { VerifiedTierService } from "./verified-tier.service";

@Module({
  controllers: [VerifiedTierController],
  providers: [VerifiedTierService],
  exports: [VerifiedTierService],
})
export class VerifiedTierModule {}
