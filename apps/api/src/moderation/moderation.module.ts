import { Module } from "@nestjs/common";
import { ModerationService } from "./moderation.service";
import { CsamService } from "./csam.service";

@Module({
  providers: [ModerationService, CsamService],
  exports: [ModerationService, CsamService],
})
export class ModerationModule {}
