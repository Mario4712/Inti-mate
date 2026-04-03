import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DualCustodyService } from "./dual-custody.service";
import { MediaAccessLogService } from "../common/access-log/media-access-log.service";
import { IsIn, IsOptional, IsString } from "class-validator";

class SubmitDecisionDto {
  @IsIn(["APPROVE", "REJECT", "ESCALATE"])
  decision!: "APPROVE" | "REJECT" | "ESCALATE";

  @IsOptional()
  @IsString()
  reason?: string;
}

class AdminResolveDto {
  @IsIn(["APPROVE", "REJECT"])
  decision!: "APPROVE" | "REJECT";

  @IsString()
  reason!: string;
}

@ApiTags("Moderation — Dual Custody")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("moderation/custody")
export class DualCustodyController {
  constructor(
    private readonly custody: DualCustodyService,
    private readonly accessLog: MediaAccessLogService,
  ) {}

  // ─── Fila de revisão ────────────────────────────────────

  @Get("queue")
  @ApiOperation({ summary: "Fila de conteúdos pendentes de custódia dupla (moderador)" })
  async getQueue(
    @Request() req: any,
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    // TODO: adicionar guard de role MODERATOR/ADMIN
    return this.custody.getReviewQueue(req.user.id, page, limit);
  }

  // ─── Submeter decisão ────────────────────────────────────

  @Post(":reviewId/decide")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Moderador submete decisão para conteúdo (custódia dupla)" })
  async submitDecision(
    @Param("reviewId") reviewId: string,
    @Body() dto: SubmitDecisionDto,
    @Request() req: any,
  ) {
    return this.custody.submitDecision(
      reviewId,
      req.user.id,
      dto.decision,
      dto.reason,
    );
  }

  // ─── Admin resolve conflito ─────────────────────────────

  @Post(":reviewId/admin-resolve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Admin resolve conflito de custódia dupla" })
  async adminResolve(
    @Param("reviewId") reviewId: string,
    @Body() dto: AdminResolveDto,
    @Request() req: any,
  ) {
    // TODO: adicionar guard de role ADMIN
    return this.custody.adminResolve(
      reviewId,
      req.user.id,
      dto.decision,
      dto.reason,
    );
  }

  // ─── Estatísticas ───────────────────────────────────────

  @Get("stats")
  @ApiOperation({ summary: "Estatísticas da fila de custódia (admin)" })
  async getStats() {
    return this.custody.getStats();
  }

  // ─── Auditoria de acessos ─────────────────────────────────

  @Get("access-log/media/:mediaId")
  @ApiOperation({ summary: "Histórico de acessos a um conteúdo (auditoria)" })
  async getMediaAccessHistory(
    @Param("mediaId") mediaId: string,
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.accessLog.getAccessHistory(mediaId, page, limit);
  }

  @Get("access-log/user/:userId")
  @ApiOperation({ summary: "Histórico de acessos de um usuário (auditoria/LGPD)" })
  async getUserAccessHistory(
    @Param("userId") userId: string,
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.accessLog.getUserAccessHistory(userId, page, limit);
  }

  @Get("access-log/ip/:ipAddress")
  @ApiOperation({ summary: "Acessos por IP (investigação de conteúdo proibido)" })
  async getAccessesByIp(
    @Param("ipAddress") ipAddress: string,
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.accessLog.getAccessesByIp(ipAddress, page, limit);
  }
}
