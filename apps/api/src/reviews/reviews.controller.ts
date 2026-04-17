import {
  Body, Controller, Delete, Get, Param, Post, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { Type } from "class-transformer";
import { ReviewsService } from "./reviews.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class UpsertReviewDto {
  @IsInt() @Min(1) @Max(5)
  @Type(() => Number)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  body?: string;
}

@ApiTags("Reviews")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Post("creator/:creatorId")
  @ApiOperation({ summary: "Criar ou atualizar avaliação de um criador (apenas assinantes ativos)" })
  upsert(
    @Param("creatorId") creatorId: string,
    @Body() dto: UpsertReviewDto,
    @Request() req: any,
  ) {
    return this.service.upsert(req.user.id, creatorId, dto.rating, dto.body);
  }

  @Get("creator/:creatorId")
  @ApiOperation({ summary: "Listar avaliações de um criador" })
  @ApiQuery({ name: "page",  required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  listByCreator(
    @Param("creatorId") creatorId: string,
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.listByCreator(creatorId, page, limit);
  }

  @Get("creator/:creatorId/mine")
  @ApiOperation({ summary: "Buscar minha avaliação de um criador" })
  getMyReview(@Param("creatorId") creatorId: string, @Request() req: any) {
    return this.service.getMyReview(req.user.id, creatorId);
  }

  @Delete(":reviewId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Excluir minha avaliação" })
  delete(@Param("reviewId") reviewId: string, @Request() req: any) {
    return this.service.delete(req.user.id, reviewId);
  }
}
