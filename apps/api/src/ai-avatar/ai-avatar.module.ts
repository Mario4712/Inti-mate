import { Module } from "@nestjs/common";
import { AiAvatarController } from "./ai-avatar.controller";
import { AiAvatarService } from "./ai-avatar.service";

@Module({
  controllers: [AiAvatarController],
  providers:   [AiAvatarService],
  exports:     [AiAvatarService],
})
export class AiAvatarModule {}
