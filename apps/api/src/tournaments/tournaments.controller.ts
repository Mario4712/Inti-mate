import {
  Controller, Get, Post, Delete, Param, Body, Query,
  UseGuards, Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import {
  IsString, IsNumber, IsEnum, IsObject, IsOptional,
  IsArray, ValidateNested, MaxLength, Min, IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { TournamentsService } from "./tournaments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class PrizeDistribEntryDto {
  @IsNumber() rank: number;
  @IsNumber() @Min(1) pct: number;
}

class CreateTournamentDto {
  @IsString() @MaxLength(200)  name:        string;
  @IsString() @MaxLength(2000) description: string;

  @IsEnum(["NEW_SUBSCRIBERS", "REVENUE", "CONTENT_VIEWS"])
  metric: "NEW_SUBSCRIBERS" | "REVENUE" | "CONTENT_VIEWS";

  @IsNumber() @Min(1)
  @Type(() => Number)
  prizePoolBRL: number;

  @IsDateString() startsAt: string;
  @IsDateString() endsAt:   string;

  @IsObject()
  rulesJson: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrizeDistribEntryDto)
  prizeDistrib?: PrizeDistribEntryDto[];
}

@ApiTags("Tournaments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("tournaments")
export class TournamentsController {
  constructor(private readonly service: TournamentsService) {}

  @Post()
  @ApiOperation({ summary: "Cria torneio (requer KYC APPROVED)" })
  create(@Body() dto: CreateTournamentDto, @Request() req: any) {
    return this.service.create(req.user.id, {
      ...dto,
      startsAt: new Date(dto.startsAt),
      endsAt:   new Date(dto.endsAt),
    });
  }

  @Get()
  @ApiOperation({ summary: "Lista torneios" })
  @ApiQuery({ name: "status", required: false, enum: ["UPCOMING", "ACTIVE", "ENDED", "PAID"] })
  findAll(@Query("status") status?: string) {
    return this.service.findAll(status);
  }

  @Get(":id")
  @ApiOperation({ summary: "Detalhe de um torneio" })
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post(":id/enter")
  @ApiOperation({ summary: "Inscrever-se no torneio (requer KYC DOCUMENT APPROVED)" })
  enter(@Param("id") id: string, @Request() req: any) {
    return this.service.enter(id, req.user.id);
  }

  @Delete(":id/enter")
  @ApiOperation({ summary: "Cancelar inscrição no torneio" })
  leave(@Param("id") id: string, @Request() req: any) {
    return this.service.leave(id, req.user.id);
  }

  @Get(":id/leaderboard")
  @ApiOperation({ summary: "Leaderboard em tempo real do torneio" })
  leaderboard(@Param("id") id: string) {
    return this.service.getLeaderboard(id);
  }
}
