import { Global, Module } from "@nestjs/common";
import { MediaAccessLogService } from "./media-access-log.service";

@Global()
@Module({
  providers: [MediaAccessLogService],
  exports: [MediaAccessLogService],
})
export class AccessLogModule {}
