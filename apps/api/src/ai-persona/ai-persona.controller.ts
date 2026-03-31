import {
  Controller, Get, Post, Put, Param, Body, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import {
  IsString, IsBoolean, IsOptional, IsArray, ValidateNested,
  MaxLength, ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { AiPersonaService } from "./ai-persona.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class FaqEntryDto {
  @IsString() @MaxLength(200) q: string;
  @IsString() @MaxLength(1000) a: string;
}

class UpsertPersonaDto {
  @IsString() @MaxLength(60)   displayName:  string;
  @IsString() @MaxLength(500)  voiceTone:    string;
  @IsString() @MaxLength(4000) systemPrompt: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => FaqEntryDto)
  faqEntries?: FaqEntryDto[];

  @IsOptional() @IsBoolean() enabled?: boolean;
}

class ReplyDto {
  @IsString() @MaxLength(2000) message: string;
}

@ApiTags("AI Persona")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("ai-persona")
export class AiPersonaController {
  constructor(private readonly service: AiPersonaService) {}

  @Put("creator/config")
  @ApiOperation({ summary: "Criador: configura ou atualiza a IA persona" })
  upsert(@Body() dto: UpsertPersonaDto, @Request() req: any) {
    return this.service.upsertPersona(req.user.id, dto);
  }

  @Get("creator/config")
  @ApiOperation({ summary: "Criador: busca configuração atual da persona" })
  getConfig(@Request() req: any) {
    return this.service.getPersona(req.user.id);
  }

  @Get("creator/history")
  @ApiOperation({ summary: "Criador: histórico de mensagens respondidas pela IA" })
  history(
    @Request() req: any,
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.service.getPersonaHistory(req.user.id, page, limit);
  }

  @Get(":creatorId/info")
  @ApiOperation({ summary: "Verifica se um criador tem IA persona ativa (sem expor configuração)" })
  async info(@Param("creatorId") creatorId: string) {
    const p = await this.service.getPersona(creatorId);
    return { enabled: p?.enabled ?? false, displayName: p?.displayName ?? null };
  }

  @Post(":creatorId/reply")
  @ApiOperation({
    summary: "Fã: envia mensagem para a IA persona do criador",
    description: "A resposta é sempre identificada como IA. Limite: 50 mensagens/dia por usuário.",
  })
  reply(
    @Param("creatorId") creatorId: string,
    @Body() dto: ReplyDto,
    @Request() req: any,
  ) {
    return this.service.replyAsPersona(creatorId, req.user.id, dto.message);
  }
}
