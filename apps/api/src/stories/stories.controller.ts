import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from "@nestjs/swagger";
import { StoriesService } from "./stories.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Stories")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("stories")
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Publica um story (expira em 24h)" })
  create(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    return this.storiesService.createStory(req.user.sub, file.buffer, file.mimetype);
  }

  @Get("feed")
  @ApiOperation({ summary: "Feed de stories dos criadores que o usuário assina" })
  feed(@Request() req: any) {
    return this.storiesService.getStoriesFeed(req.user.sub);
  }

  @Get("creator/:creatorId")
  @ApiOperation({ summary: "Stories de um criador específico" })
  getByCreator(@Param("creatorId") creatorId: string, @Request() req: any) {
    return this.storiesService.getCreatorStories(creatorId, req.user.sub);
  }

  @Post(":storyId/view")
  @ApiOperation({ summary: "Registra visualização de um story" })
  recordView(@Param("storyId") storyId: string, @Request() req: any) {
    return this.storiesService.recordView(storyId, req.user.sub);
  }
}
