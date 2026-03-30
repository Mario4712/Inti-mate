import { Module } from "@nestjs/common";
import { VrContentController } from "./vr-content.controller";
import { VrContentService } from "./vr-content.service";

@Module({
  controllers: [VrContentController],
  providers:   [VrContentService],
  exports:     [VrContentService],
})
export class VrContentModule {}
