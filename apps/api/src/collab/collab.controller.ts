import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import {
  IsString, IsInt, IsNumber, Min, Max, MaxLength,
} from "class-validator";
import { CollabService } from "./collab.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class SendInterestDto {
  @IsString() targetId: string;
}

class CreateContractDto {
  @IsString() @MaxLength(120) title:       string;
  @IsString() @MaxLength(2000) description: string;

  @IsNumber() @Min(1) @Max(99)
  revenueSharePct: number;

  @IsInt() @Min(1) @Max(365)
  durationDays: number;
}

class SignContractDto {
  @IsString() otp: string;
}

@ApiTags("Collab")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("collab")
export class CollabController {
  constructor(private readonly service: CollabService) {}

  // ── Item 39: Sugestões & Match ───────────────────────────

  @Get("suggestions")
  @ApiOperation({ summary: "Sugestões de colaboração baseadas em sobreposição de audiência" })
  suggestions(
    @Request() req: any,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.service.getSuggestions(req.user.sub, limit);
  }

  @Post("interest")
  @ApiOperation({ summary: "Enviar interesse de colaboração (mutual accept)" })
  sendInterest(@Body() dto: SendInterestDto, @Request() req: any) {
    return this.service.sendInterest(req.user.sub, dto.targetId);
  }

  @Patch("match/:matchId/reject")
  @ApiOperation({ summary: "Rejeitar um match pendente" })
  rejectMatch(@Param("matchId") matchId: string, @Request() req: any) {
    return this.service.rejectMatch(req.user.sub, matchId);
  }

  @Get("matches")
  @ApiOperation({ summary: "Lista matches ativos do criador autenticado" })
  listMatches(@Request() req: any) {
    return this.service.listMatches(req.user.sub);
  }

  @Get("pending")
  @ApiOperation({ summary: "Lista matches pendentes (aguardando resposta)" })
  listPending(@Request() req: any) {
    return this.service.listPending(req.user.sub);
  }

  // ── Item 40: Contratos ────────────────────────────────────

  @Post("contracts")
  @ApiOperation({ summary: "Cria rascunho de contrato para um match ativo" })
  createContract(@Body() dto: CreateContractDto & { matchId: string }, @Request() req: any) {
    const { matchId, ...rest } = dto;
    return this.service.createContract(req.user.sub, matchId, rest);
  }

  @Post("contracts/:contractId/sign")
  @ApiOperation({
    summary: "Assina contrato via OTP (ambos criadores devem assinar)",
    description: "OTP enviado por SMS ao criador. Contrato torna-se ACTIVE quando ambos assinarem.",
  })
  signContract(
    @Param("contractId") contractId: string,
    @Body() dto: SignContractDto,
    @Request() req: any,
  ) {
    return this.service.signContract(req.user.sub, contractId, dto.otp);
  }

  @Get("contracts/:contractId")
  @ApiOperation({ summary: "Detalhe de um contrato" })
  getContract(@Param("contractId") contractId: string, @Request() req: any) {
    return this.service.getContract(req.user.sub, contractId);
  }

  @Get("contracts")
  @ApiOperation({ summary: "Lista contratos ativos e rascunhos do criador" })
  listContracts(@Request() req: any) {
    return this.service.listContracts(req.user.sub);
  }
}
