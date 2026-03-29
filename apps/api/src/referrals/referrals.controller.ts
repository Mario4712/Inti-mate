import {
  Controller, Get, Post, Patch, Body, Param, UseGuards, Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import {
  IsString, IsOptional, IsInt, IsNumber, IsDateString, Min, Max,
} from "class-validator";
import { ReferralsService } from "./referrals.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class ApplyCodeDto {
  @IsString()
  code: string;
}

class SlotConfigDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxSlots?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  promoPrice?: number | null;

  @IsOptional()
  @IsDateString()
  promoEndsAt?: string | null;
}

@ApiTags("Referrals & Pricing")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("referrals")
export class ReferralsController {
  constructor(private readonly service: ReferralsService) {}

  // ─── Referência ───────────────────────────────────────────

  @Get("my-code")
  @ApiOperation({ summary: "Gera/busca código de indicação do usuário" })
  myCode(@Request() req: any) {
    return this.service.getOrCreateCode(req.user.sub);
  }

  @Post("apply")
  @ApiOperation({ summary: "Aplica código de indicação (somente no cadastro ou primeiros 30 dias)" })
  apply(@Body() dto: ApplyCodeDto, @Request() req: any) {
    return this.service.applyReferralCode(req.user.sub, dto.code);
  }

  @Get("stats")
  @ApiOperation({ summary: "Estatísticas de indicações do usuário" })
  stats(@Request() req: any) {
    return this.service.getStats(req.user.sub);
  }

  // ─── Streaks ─────────────────────────────────────────────

  @Post("activity")
  @ApiOperation({ summary: "Registra atividade diária do usuário (mantém streak)" })
  recordActivity(@Request() req: any) {
    return this.service.recordActivity(req.user.sub);
  }

  @Get("streak")
  @ApiOperation({ summary: "Streak atual e badges do usuário" })
  streak(@Request() req: any) {
    return this.service.getStreak(req.user.sub);
  }

  // ─── Slots & Promoções ────────────────────────────────────

  @Get("slots/:creatorId")
  @ApiOperation({ summary: "Vagas disponíveis e promoção ativa de um criador" })
  slots(@Param("creatorId") creatorId: string) {
    return this.service.getAvailableSlots(creatorId);
  }

  @Patch("slots/config")
  @ApiOperation({ summary: "Criador: configura vagas limitadas e preço promocional" })
  upsertSlotConfig(@Body() dto: SlotConfigDto, @Request() req: any) {
    return this.service.upsertSlotConfig(req.user.sub, {
      maxSlots:    dto.maxSlots,
      promoPrice:  dto.promoPrice,
      promoEndsAt: dto.promoEndsAt ? new Date(dto.promoEndsAt) : null,
    });
  }
}
