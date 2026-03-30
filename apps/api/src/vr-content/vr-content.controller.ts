import {
  Controller, Get, Post, Put, Param, Body, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import {
  IsString, IsEnum, IsInt, IsOptional, Min, Max, IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import { VrContentService } from "./vr-content.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class AttachVrDto {
  @IsString() mediaId: string;

  @IsEnum(["VR180", "VR360"])
  format: "VR180" | "VR360";

  @IsString() resolution: string;

  @IsIn(["top-bottom", "side-by-side"])
  stereoMode: string;

  @IsInt() @Min(180) @Max(360)
  @Type(() => Number)
  fovDegrees: number;

  @IsOptional() @IsString() key2K?: string;
  @IsOptional() @IsString() key4K?: string;
  @IsOptional() @IsString() key8K?: string;
}

@ApiTags("VR Content")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("vr-content")
export class VrContentController {
  constructor(private readonly service: VrContentService) {}

  @Put("attach")
  @ApiOperation({ summary: "Criador: registra metadados VR em um conteúdo existente" })
  attach(@Body() dto: AttachVrDto, @Request() req: any) {
    const { mediaId, ...rest } = dto;
    return this.service.attachVrMetadata(req.user.sub, mediaId, rest);
  }

  @Get()
  @ApiOperation({ summary: "Lista todos os conteúdos VR disponíveis" })
  list(
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.listVrContent(page, limit);
  }

  @Get(":mediaId")
  @ApiOperation({ summary: "Metadados VR de um conteúdo" })
  getMeta(@Param("mediaId") mediaId: string) {
    return this.service.getVrMetadata(mediaId);
  }

  @Get(":mediaId/webxr-config")
  @ApiOperation({
    summary: "Configuração WebXR para o player (A-Frame)",
    description: "Retorna formato, modo estéreo, FOV e qualidade máxima disponível para o viewer.",
  })
  webXrConfig(@Param("mediaId") mediaId: string, @Request() req: any) {
    return this.service.getWebXrConfig(mediaId, req.user.sub);
  }

  @Get(":mediaId/access/:quality")
  @ApiOperation({
    summary: "URL pre-assinada de acesso por qualidade",
    description:
      "2K: todos os assinantes. 4K: PPV/premium. 8K: Verified Tier. Expira em 2h.",
  })
  getAccessUrl(
    @Param("mediaId") mediaId:         string,
    @Param("quality") quality:         string,
    @Request() req: any,
  ) {
    if (!["2K", "4K", "8K"].includes(quality)) {
      throw new Error("Qualidade inválida. Use: 2K, 4K ou 8K");
    }
    return this.service.getAccessUrl(req.user.sub, mediaId, quality as any);
  }
}
