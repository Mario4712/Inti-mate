import { Module } from "@nestjs/common";
import { CollabController } from "./collab.controller";
import { CollabService } from "./collab.service";
import { ContentModule } from "../content/content.module";

@Module({
  imports:     [ContentModule],
  controllers: [CollabController],
  providers:   [CollabService],
  exports:     [CollabService],
})
export class CollabModule {}
