import { Module } from "@nestjs/common";
import { DigitalItemsController } from "./digital-items.controller";
import { DigitalItemsService } from "./digital-items.service";
import { ContentModule } from "../content/content.module";

@Module({
  imports: [ContentModule],
  controllers: [DigitalItemsController],
  providers: [DigitalItemsService],
})
export class DigitalItemsModule {}
