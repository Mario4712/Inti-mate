import { Module } from "@nestjs/common";
import { ContentGenController } from "./content-gen.controller";
import { ContentGenService } from "./content-gen.service";

@Module({
  controllers: [ContentGenController],
  providers:   [ContentGenService],
  exports:     [ContentGenService],
})
export class ContentGenModule {}
