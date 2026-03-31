import {
  Controller, Post, Get, Patch, Param, Body, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import {
  DigitalItemsService,
  CreateDigitalItemDto,
  CreateOrderDto,
} from "./digital-items.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Digital Items")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("digital-items")
export class DigitalItemsController {
  constructor(private readonly service: DigitalItemsService) {}

  // ─── Catálogo ─────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: "Criador: cria item digital no catálogo" })
  createItem(@Body() dto: CreateDigitalItemDto, @Request() req: any) {
    return this.service.createItem(req.user.id, dto);
  }

  @Patch(":itemId/deactivate")
  @ApiOperation({ summary: "Criador: desativa item do catálogo" })
  deactivate(@Param("itemId") itemId: string, @Request() req: any) {
    return this.service.deactivateItem(req.user.id, itemId);
  }

  @Get("catalog/:creatorId")
  @ApiOperation({ summary: "Catálogo público de itens de um criador" })
  catalog(@Param("creatorId") creatorId: string) {
    return this.service.getCreatorCatalog(creatorId);
  }

  // ─── Pedidos ──────────────────────────────────────────────

  @Post("orders")
  @ApiOperation({ summary: "Comprador: realiza pedido de item digital" })
  createOrder(@Body() dto: CreateOrderDto, @Request() req: any) {
    return this.service.createOrder(req.user.id, dto);
  }

  @Patch("orders/:orderId/deliver")
  @ApiOperation({ summary: "Criador: marca pedido como entregue com URL de download" })
  deliver(
    @Param("orderId") orderId: string,
    @Body("deliveryUrl") deliveryUrl: string,
    @Request() req: any,
  ) {
    return this.service.deliverOrder(req.user.id, orderId, deliveryUrl);
  }

  @Get("orders/mine")
  @ApiOperation({ summary: "Comprador: meus pedidos" })
  myOrders(
    @Request() req: any,
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.getMyOrders(req.user.id, page, limit);
  }

  @Get("orders/creator")
  @ApiOperation({ summary: "Criador: pedidos recebidos" })
  creatorOrders(
    @Request() req: any,
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.getCreatorOrders(req.user.id, page, limit);
  }
}
