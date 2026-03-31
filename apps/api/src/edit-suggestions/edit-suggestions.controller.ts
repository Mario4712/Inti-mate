import {
  Controller, Get, Post, Param, Body, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import {
  IsString, IsObject, IsOptional, IsInt, IsIn,
  MaxLength, Min, Max,
} from "class-validator";
import { Type } from "class-transformer";
import { EditSuggestionsService } from "./edit-suggestions.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class CreateSuggestionDto {
  @IsString() mediaId: string;

  @IsIn(["cut", "caption", "soundtrack"])
  type: string;

  @IsObject()
  payload: Record<string, unknown>;

  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

class AcceptSuggestionDto {
  @IsInt() @Min(0) @Max(50)
  @Type(() => Number)
  revenueSharePct: number;
}

@ApiTags("Edit Suggestions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("edit-suggestions")
export class EditSuggestionsController {
  constructor(private readonly service: EditSuggestionsService) {}

  // ── Fã ────────────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: "Fã envia sugestão de edição (requer assinatura ativa)",
    description: "Tipos: cut, caption, soundtrack. Máx. 10 pendentes por criador.",
  })
  create(@Body() dto: CreateSuggestionDto, @Request() req: any) {
    return this.service.createSuggestion(
      req.user.id, dto.mediaId, dto.type, dto.payload, dto.note,
    );
  }

  @Get("my")
  @ApiOperation({ summary: "Sugestões enviadas pelo fã autenticado" })
  myFanSuggestions(
    @Request() req: any,
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.getFanSuggestions(req.user.id, page, limit);
  }

  // ── Criador ───────────────────────────────────────────────

  @Get("creator")
  @ApiOperation({ summary: "Lista sugestões recebidas pelo criador autenticado" })
  @ApiQuery({ name: "status", required: false, enum: ["PENDING", "APPROVED", "REJECTED"] })
  creatorSuggestions(
    @Request() req: any,
    @Query("status") status?: string,
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number = 1,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.service.getCreatorSuggestions(req.user.id, status, page, limit);
  }

  @Post(":id/accept")
  @ApiOperation({
    summary: "Criador aceita sugestão e define % de monetização para o fã",
    description: "revenueSharePct: 0–50%. Ao aceitar, fã recebe percentual da receita do conteúdo editado.",
  })
  accept(
    @Param("id") id: string,
    @Body() dto: AcceptSuggestionDto,
    @Request() req: any,
  ) {
    return this.service.acceptSuggestion(req.user.id, id, dto.revenueSharePct);
  }

  @Post(":id/reject")
  @ApiOperation({ summary: "Criador rejeita sugestão" })
  reject(@Param("id") id: string, @Request() req: any) {
    return this.service.rejectSuggestion(req.user.id, id);
  }
}
