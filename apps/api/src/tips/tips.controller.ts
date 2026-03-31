import {
  Controller, Post, Get, Param, Body, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { TipsService, SendTipDto } from "./tips.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Tips")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("tips")
export class TipsController {
  constructor(private readonly tipsService: TipsService) {}

  @Post()
  @ApiOperation({ summary: "Envia gorjeta para um criador" })
  sendTip(@Body() dto: SendTipDto, @Request() req: any) {
    return this.tipsService.sendTip(req.user.id, dto);
  }

  @Get("leaderboard/:creatorId")
  @ApiOperation({ summary: "Top apoiadores do criador (apenas com consentimento público)" })
  leaderboard(
    @Param("creatorId") creatorId: string,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.tipsService.getLeaderboard(creatorId, limit);
  }

  @Get("mine")
  @ApiOperation({ summary: "Histórico de gorjetas enviadas pelo usuário" })
  myTips(
    @Request() req: any,
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.tipsService.getMyTips(req.user.id, page, limit);
  }
}
