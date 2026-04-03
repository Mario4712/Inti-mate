import { Module, forwardRef } from "@nestjs/common";
import { ModerationService } from "./moderation.service";
import { CsamService } from "./csam.service";
import { DualCustodyService } from "./dual-custody.service";
import { DualCustodyController } from "./dual-custody.controller";
import { AccessLogModule } from "../common/access-log/access-log.module";

@Module({
  imports: [AccessLogModule],
  controllers: [DualCustodyController],
  providers: [ModerationService, CsamService, DualCustodyService],
  exports: [ModerationService, CsamService, DualCustodyService],
})
export class ModerationModule {}
