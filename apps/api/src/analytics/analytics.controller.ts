import { Controller, Get, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Analytics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Creator Intelligence Dashboard: receita, assinantes, churn, conteúdo top" })
  dashboard(@Request() req: any) {
    return this.analyticsService.getCreatorDashboard(req.user.sub);
  }

  @Get("revenue")
  @ApiOperation({ summary: "Breakdown de receita (últimos 30 dias vs 30 anteriores)" })
  revenue(@Request() req: any) {
    return this.analyticsService.getRevenueBreakdown(req.user.sub);
  }

  @Get("subscribers")
  @ApiOperation({ summary: "Funil de assinantes: ativos, novos, cancelamentos" })
  subscribers(@Request() req: any) {
    return this.analyticsService.getSubscriberFunnel(req.user.sub);
  }

  @Get("churn")
  @ApiOperation({ summary: "Taxa de churn mensal e tempo médio de assinatura" })
  churn(@Request() req: any) {
    return this.analyticsService.getChurnAnalysis(req.user.sub);
  }

  @Get("top-content")
  @ApiOperation({ summary: "Conteúdos mais assistidos/vistos" })
  topContent(@Request() req: any) {
    return this.analyticsService.getTopContent(req.user.sub);
  }

  @Get("activity-hours")
  @ApiOperation({ summary: "Horários de pico de atividade dos assinantes" })
  activityHours(@Request() req: any) {
    return this.analyticsService.getPeakActivityHours(req.user.sub);
  }
}
