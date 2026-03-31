import {
  Controller, Get, Param, Query,
  UseGuards, Request, ParseBoolPipe,
  DefaultValuePipe, ParseIntPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { RecommendationsService } from "./recommendations.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Recommendations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("recommendations")
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Get()
  @ApiOperation({ summary: "Recomendações personalizadas de criadores para o usuário autenticado" })
  @ApiQuery({ name: "limit",            required: false, type: Number })
  @ApiQuery({ name: "withExplanations", required: false, type: Boolean })
  getRecommendations(
    @Request() req: any,
    @Query("limit",            new DefaultValuePipe(10),    ParseIntPipe)  limit:            number,
    @Query("withExplanations", new DefaultValuePipe(false), ParseBoolPipe) withExplanations: boolean,
  ) {
    return this.service.getRecommendations(req.user.id, limit, withExplanations);
  }

  @Get("explain/:creatorId")
  @ApiOperation({ summary: "Explica por que um criador foi recomendado ao usuário" })
  explain(
    @Param("creatorId") creatorId: string,
    @Request() req: any,
  ) {
    return this.service.explainRecommendation(req.user.id, creatorId).then((reason) => ({ reason }));
  }
}
