import {
  Controller, Get, Post, Delete, Param, Body, Query,
  UseGuards, Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import {
  IsString, IsInt, IsEnum, IsObject, MaxLength, Min,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { TournamentsService } from "./tournaments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class CreateTournamentDto {
  @IsString() @MaxLength(120)  title:       string;
  @IsString() @MaxLength(2000) description: string;

  @IsEnum(["SUBSCRIBERS", "TIPS", "VIEWS", "LIKES"])
  metric: "SUBSCRIBERS" | "TIPS" | "VIEWS" | "LIKES";

  @IsInt() @Min(100)
  @Type(() => Number)
  prizePool: number; // centavos

  @IsDateString() startsAt: string;
  @IsDateString() endsAt:   string;

  @IsObject() rules: Record<string, unknown>;
}

@ApiTags("Tournaments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("tournaments")
export class TournamentsController {
  constructor(private readonly service: TournamentsService) {}

  @Post()
  @ApiOperation({ summary: "Cria torneio (admin/criador KYC)" })
  create(@Body() dto: CreateTournamentDto, @Request() req: any) {
    return this.service.create(req.user.sub, {
      ...dto,
      startsAt: new Date(dto.startsAt),
      endsAt:   new Date(dto.endsAt),
    });
  }

  @Get()
  @ApiOperation({ summary: "Lista torneios (filtra por status)" })
  @ApiQuery({ name: "status", required: false, enum: ["UPCOMING", "ACTIVE", "FINISHED"] })
  findAll(@Query("status") status?: string) {
    return this.service.findAll(status);
  }

  @Get(":id")
  @ApiOperation({ summary: "Detalhe de um torneio" })
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post(":id/enter")
  @ApiOperation({ summary: "Inscrever-se no torneio (requer KYC APPROVED)" })
  enter(@Param("id") id: string, @Request() req: any) {
    return this.service.enter(id, req.user.sub);
  }

  @Delete(":id/enter")
  @ApiOperation({ summary: "Cancelar inscrição no torneio" })
  leave(@Param("id") id: string, @Request() req: any) {
    return this.service.leave(id, req.user.sub);
  }

  @Get(":id/leaderboard")
  @ApiOperation({ summary: "Leaderboard em tempo real do torneio" })
  leaderboard(@Param("id") id: string) {
    return this.service.getLeaderboard(id);
  }
}
