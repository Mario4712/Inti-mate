import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiOperation } from "@nestjs/swagger";
import { ContentService } from "./content.service";
import { UpdateMediaDto } from "./dto/content.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtGuard } from "../auth/guards/optional-jwt.guard";

const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150 MB

@ApiTags("Content")
@ApiBearerAuth()
@Controller("content")
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // ─── Upload ──────────────────────────────────────────────

  @Post("upload")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file:       { type: "string", format: "binary" },
        visibility: { type: "string", enum: ["PUBLIC", "SUBSCRIBERS", "PPV"], default: "SUBSCRIBERS" },
      },
    },
  })
  @ApiOperation({ summary: "Upload de foto ou vídeo" })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query("visibility") visibility = "SUBSCRIBERS",
    @Request() req: any,
  ) {
    return this.contentService.uploadMedia(
      req.user.id,
      file.buffer,
      file.mimetype,
      visibility,
    );
  }

  // ─── Galeria ─────────────────────────────────────────────

  @Get("creator/:creatorId")
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: "Galeria de um criador (pública ou por assinatura)" })
  async getGallery(
    @Param("creatorId") creatorId: string,
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Request() req: any,
  ) {
    const viewerId = req.user?.sub ?? null;
    return this.contentService.getCreatorGallery(creatorId, viewerId, page, limit);
  }

  // ─── Item individual ──────────────────────────────────────

  @Get(":mediaId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Acessa um item de mídia (incrementa view count)" })
  async getMediaItem(
    @Param("mediaId") mediaId: string,
    @Request() req: any,
  ) {
    return this.contentService.getMediaItem(mediaId, req.user.id);
  }

  // ─── Update ───────────────────────────────────────────────

  @Patch(":mediaId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Atualiza título / descrição / visibilidade do conteúdo" })
  async updateMedia(
    @Param("mediaId") mediaId: string,
    @Body() dto: UpdateMediaDto,
    @Request() req: any,
  ) {
    return this.contentService.updateMedia(req.user.id, mediaId, dto);
  }

  // ─── Delete ───────────────────────────────────────────────

  @Delete(":mediaId")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove um conteúdo e o arquivo no storage" })
  async deleteMedia(
    @Param("mediaId") mediaId: string,
    @Request() req: any,
  ) {
    return this.contentService.deleteMedia(req.user.id, mediaId);
  }
}
