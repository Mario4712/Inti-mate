import { Module } from "@nestjs/common";
import { WebhookDlqService } from "./webhook-dlq.service";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  providers: [WebhookDlqService],
  exports: [WebhookDlqService],
})
export class DlqModule {}
