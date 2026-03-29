import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PpvService } from "./ppv.service";
import { CreatePpvDto, PurchasePpvDto } from "./dto/ppv.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Role } from "@intimare/database";

@ApiTags("PPV")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller({ path: "ppv", version: "1" })
export class PpvController {
  constructor(private ppvService: PpvService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.CREATOR)
  @ApiOperation({ summary: "Criador cria conteúdo PPV (vai para moderação)" })
  create(@CurrentUser("id") creatorId: string, @Body() dto: CreatePpvDto) {
    return this.ppvService.create(creatorId, dto);
  }

  @Get("creator/:creatorId")
  @ApiOperation({ summary: "Lista PPVs aprovados de um criador" })
  listByCreator(
    @Param("creatorId") creatorId: string,
    @Query("page") page = 1,
    @Query("limit") limit = 20,
  ) {
    return this.ppvService.listByCreator(creatorId, +page, +limit);
  }

  @Get(":contentId")
  @ApiOperation({ summary: "Detalhes de um PPV (preview + preço)" })
  getOne(
    @Param("contentId") contentId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.ppvService.getOne(contentId, userId);
  }

  @Post(":contentId/purchase")
  @ApiOperation({ summary: "Comprar conteúdo PPV" })
  purchase(
    @CurrentUser("id") buyerId: string,
    @Param("contentId") contentId: string,
    @Body() dto: PurchasePpvDto,
  ) {
    return this.ppvService.purchase(buyerId, contentId, dto);
  }

  @Get("mine/purchases")
  @ApiOperation({ summary: "Meus PPVs comprados" })
  myPurchases(@CurrentUser("id") userId: string) {
    return this.ppvService.myPurchases(userId);
  }
}
