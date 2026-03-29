import { Module } from "@nestjs/common";
import { StoriesController } from "./stories.controller";
import { StoriesService } from "./stories.service";
import { ContentModule } from "../content/content.module";
import { ModerationModule } from "../moderation/moderation.module";

@Module({
  imports: [ContentModule, ModerationModule],
  controllers: [StoriesController],
  providers: [StoriesService],
  exports: [StoriesService],
})
export class StoriesModule {}
