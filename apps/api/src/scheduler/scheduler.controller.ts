import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import {
  IsEnum, IsString, IsOptional, IsDateString, MaxLength,
} from "class-validator";
import { SchedulerService, Platform } from "./scheduler.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class CreatePostDto {
  @IsEnum(["INSTAGRAM", "TWITTER_X", "TIKTOK"])
  platform: Platform;

  @IsString()
  @MaxLength(2200)
  caption: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsDateString()
  scheduledAt: string;
}

@ApiTags("Social Scheduler")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("scheduler")
export class SchedulerController {
  constructor(private readonly service: SchedulerService) {}

  @Post("posts")
  @ApiOperation({ summary: "Agenda post de teaser para Instagram, X/Twitter ou TikTok" })
  schedule(@Body() dto: CreatePostDto, @Request() req: any) {
    return this.service.schedulePost(req.user.id, {
      platform:    dto.platform,
      caption:     dto.caption,
      mediaUrl:    dto.mediaUrl,
      scheduledAt: new Date(dto.scheduledAt),
    });
  }

  @Patch("posts/:postId/cancel")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Cancela post agendado" })
  cancel(@Param("postId") postId: string, @Request() req: any) {
    return this.service.cancelPost(req.user.id, postId);
  }

  @Get("posts")
  @ApiOperation({ summary: "Lista todos os posts agendados e publicados" })
  list(@Request() req: any) {
    return this.service.listPosts(req.user.id);
  }

  @Get("suggest")
  @ApiOperation({ summary: "Sugere melhores horários para publicar baseado na atividade dos assinantes" })
  suggest(@Request() req: any) {
    return this.service.suggestBestTimes(req.user.id);
  }

  @Get("report")
  @ApiOperation({ summary: "Relatório de cliques e conversões por plataforma" })
  report(@Request() req: any) {
    return this.service.getReport(req.user.id);
  }

  // Endpoint público para rastrear cliques via link de redirecionamento
  @Get("track/:postId")
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: "Rastreia clique em link de post (redireciona para perfil)" })
  async trackClick(@Param("postId") postId: string) {
    await this.service.trackClick(postId);
    // Na prática, retorna redirect 302 para o perfil do criador
    return { tracked: true };
  }
}
