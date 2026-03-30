import { Module } from "@nestjs/common";
import { EditSuggestionsController } from "./edit-suggestions.controller";
import { EditSuggestionsService } from "./edit-suggestions.service";

@Module({
  controllers: [EditSuggestionsController],
  providers:   [EditSuggestionsService],
  exports:     [EditSuggestionsService],
})
export class EditSuggestionsModule {}
