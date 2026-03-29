import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { SearchService } from "./search.service";
import { DiscoveryService } from "./discovery.service";
import { SearchCreatorsDto } from "./dto/search.dto";
import { OptionalJwtGuard } from "../auth/guards/optional-jwt.guard";

@ApiTags("Search & Discovery")
@Controller("search")
export class SearchController {
  constructor(
    private readonly searchService:    SearchService,
    private readonly discoveryService: DiscoveryService,
  ) {}

  // ─── Busca ────────────────────────────────────────────────

  @Get("creators")
  @ApiOperation({ summary: "Busca criadores com filtros (Elasticsearch com fallback PostgreSQL)" })
  searchCreators(@Query() dto: SearchCreatorsDto) {
    return this.searchService.searchCreators(dto);
  }

  @Get("tags/suggest")
  @ApiOperation({ summary: "Autocomplete de tags" })
  suggestTags(@Query("q") q: string) {
    return this.searchService.suggestTags(q ?? "");
  }

  // ─── Descoberta ───────────────────────────────────────────

  @Get("discovery")
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: "Página de descoberta: destaques, novos, categorias, recomendações" })
  discovery(@Request() req: any) {
    return this.discoveryService.getDiscoveryPage(req.user?.sub);
  }

  @Get("recommendations")
  @UseGuards(OptionalJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Recomendações personalizadas (collaborative filtering)" })
  recommendations(@Request() req: any) {
    const viewerId = req.user?.sub;
    if (!viewerId) return { items: [], reason: "unauthenticated" };
    return this.discoveryService.getRecommendations(viewerId);
  }
}
