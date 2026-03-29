import { Module } from "@nestjs/common";
import { AiPersonaController } from "./ai-persona.controller";
import { AiPersonaService } from "./ai-persona.service";

@Module({
  controllers: [AiPersonaController],
  providers: [AiPersonaService],
  exports: [AiPersonaService],
})
export class AiPersonaModule {}
