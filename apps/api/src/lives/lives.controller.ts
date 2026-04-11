import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, Request, HttpCode, HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import {
  IsString, IsOptional, IsBoolean, IsInt, IsDateString,
  MaxLength, Min, Max,
} from "class-validator";
import { Type } from "class-transformer";
import { LivesService } from "./lives.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtGuard } from "../auth/guards/optional-jwt.guard";

class CreateLiveDto {
  @IsString() @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsBoolean() requiresSubscription?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(100000) maxViewers?: number;
  @IsOptional() @IsBoolean() recordingEnabled?: boolean;
}

class SendSuperChatDto {
  @Type(() => Number) @IsInt() @Min(200) amountCents: number;    // em centavos (mínimo R$ 2,00)
  @IsString() @MaxLength(200) message: string;
}

@ApiTags("Lives")
@ApiBearerAuth()
@Controller("lives")
export class LivesController {
  constructor(private readonly livesService: LivesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Criador: agenda ou inicia uma live" })
  create(@Body() dto: CreateLiveDto, @Request() req: any) {
    return this.livesService.createLive(req.user.id, {
      ...dto,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });
  }

  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: "Lista lives agendadas e ao vivo" })
  list() {
    return this.livesService.listUpcoming();
  }

  @Get("creator/:creatorId")
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: "Lives de um criador específico" })
  byCreator(@Param("creatorId") creatorId: string) {
    return this.livesService.listUpcoming(creatorId);
  }

  @Post(":liveId/join")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Espectador: obtém token LiveKit para entrar na live" })
  join(@Param("liveId") liveId: string, @Request() req: any) {
    return this.livesService.getViewerToken(liveId, req.user.id);
  }

  @Patch(":liveId/end")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Criador: encerra a live" })
  end(@Param("liveId") liveId: string, @Request() req: any) {
    return this.livesService.endLive(req.user.id, liveId);
  }

  // ─── Super Chat ───────────────────────────────────────────

  @Post(":liveId/superchat")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Fã: envia Super Chat (mensagem destacada paga)" })
  superChat(
    @Param("liveId") liveId: string,
    @Body() dto: SendSuperChatDto,
    @Request() req: any,
  ) {
    return this.livesService.sendSuperChat(
      liveId,
      req.user.id,
      dto.amountCents / 100,
      dto.message,
    );
  }

  @Get(":liveId/superchat")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Lista super chats de uma live" })
  getSuperChats(@Param("liveId") liveId: string) {
    return this.livesService.getLiveSuperChats(liveId);
  }
}
