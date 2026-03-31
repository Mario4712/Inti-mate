import {
  Controller, Get, Post, Param, Body,
  UseGuards, Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import {
  IsString, IsOptional, IsInt, IsDateString, MaxLength, Min,
} from "class-validator";
import { AuctionsService } from "./auctions.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtGuard } from "../auth/guards/optional-jwt.guard";

class CreateAuctionDto {
  @IsString() @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() mediaId?: string;
  @IsInt() @Min(100) startingBidCents: number;
  @IsDateString() endsAt: string;
}

class PlaceBidDto {
  @IsInt() @Min(100) amountCents: number;
}

class DeliverDto {
  @IsString() mediaKey: string;
}

@ApiTags("Auctions")
@ApiBearerAuth()
@Controller("auctions")
export class AuctionsController {
  constructor(private readonly service: AuctionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Criador: cria um leilão de conteúdo exclusivo" })
  create(@Body() dto: CreateAuctionDto, @Request() req: any) {
    return this.service.create(req.user.id, {
      title:       dto.title,
      description: dto.description,
      mediaId:     dto.mediaId,
      startingBid: dto.startingBidCents,
      endsAt:      new Date(dto.endsAt),
    });
  }

  @Get("creator/:creatorId")
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: "Lista leilões de um criador" })
  listByCreator(@Param("creatorId") creatorId: string) {
    return this.service.listByCreator(creatorId);
  }

  @Get(":auctionId")
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: "Detalhes do leilão com histórico de lances" })
  getOne(@Param("auctionId") auctionId: string) {
    return this.service.getAuction(auctionId);
  }

  @Post(":auctionId/bid")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Fã: faz um lance no leilão" })
  placeBid(
    @Param("auctionId") auctionId: string,
    @Body() dto: PlaceBidDto,
    @Request() req: any,
  ) {
    return this.service.placeBid(auctionId, req.user.id, dto.amountCents);
  }

  @Post(":auctionId/deliver")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Criador: entrega conteúdo ao vencedor via URL pré-assinada (72h)" })
  deliver(
    @Param("auctionId") auctionId: string,
    @Body() dto: DeliverDto,
    @Request() req: any,
  ) {
    return this.service.deliverToWinner(req.user.id, auctionId, dto.mediaKey);
  }
}
