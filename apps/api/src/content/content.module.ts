import { Module } from "@nestjs/common";
import { ContentController } from "./content.controller";
import { ContentService } from "./content.service";
import { StorageService } from "./storage.service";
import { MediaProcessorService } from "./media-processor.service";
import { ModerationModule } from "../moderation/moderation.module";

@Module({
  imports: [ModerationModule],
  controllers: [ContentController],
  providers: [ContentService, StorageService, MediaProcessorService],
  exports: [ContentService, StorageService, MediaProcessorService],
})
export class ContentModule {}
