import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import {
  IsOptional, IsString, IsInt, Min, Max,
} from "class-validator";
import { ToysService } from "./toys.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class StartSessionDto {
  @IsOptional() @IsString() liveId?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) minIntensity?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) maxIntensity?: number;
  @IsInt() @Min(10) pricePerMinCents: number;
  @IsOptional() @IsInt() @Min(100) minPayCents?: number;
}

class PurchaseControlDto {
  @IsInt() @Min(30) @Max(3600) durationSec: number;
  @IsInt() @Min(0)  @Max(100)  intensity:   number;
}

@ApiTags("Toys IoT")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("toys")
export class ToysController {
  constructor(private readonly toysService: ToysService) {}

  // ─── Criador ──────────────────────────────────────────────

  @Post("session")
  @ApiOperation({ summary: "Criador: inicia sessão de controle remoto (consentimento por sessão)" })
  startSession(@Body() dto: StartSessionDto, @Request() req: any) {
    return this.toysService.startSession(req.user.sub, {
      liveId:       dto.liveId,
      minIntensity: dto.minIntensity,
      maxIntensity: dto.maxIntensity,
      pricePerMin:  dto.pricePerMinCents,
      minPayBRL:    dto.minPayCents,
    });
  }

  @Patch("session/:sessionId/end")
  @ApiOperation({ summary: "Criador: encerra sessão de controle remoto" })
  endSession(@Param("sessionId") sessionId: string, @Request() req: any) {
    return this.toysService.endSession(req.user.sub, sessionId);
  }

  @Get("session/active")
  @ApiOperation({ summary: "Criador: status da sessão ativa (se houver)" })
  activeSession(@Request() req: any) {
    return this.toysService.getActiveSession(req.user.sub);
  }

  // ─── Público ──────────────────────────────────────────────

  @Get("session/:sessionId")
  @ApiOperation({ summary: "Info pública de uma sessão (preço, limites)" })
  sessionInfo(@Param("sessionId") sessionId: string) {
    return this.toysService.getPublicSessionInfo(sessionId);
  }

  // ─── Fã ───────────────────────────────────────────────────

  @Post("session/:sessionId/control")
  @ApiOperation({ summary: "Fã: paga por tempo de controle do dispositivo" })
  purchaseControl(
    @Param("sessionId") sessionId: string,
    @Body() dto: PurchaseControlDto,
    @Request() req: any,
  ) {
    return this.toysService.purchaseControl(
      req.user.sub,
      sessionId,
      dto.durationSec,
      dto.intensity,
    );
  }
}
