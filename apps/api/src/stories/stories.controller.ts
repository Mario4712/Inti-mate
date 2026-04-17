import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from "@nestjs/swagger";
import { IsArray, IsString, MaxLength, ArrayMinSize, ArrayMaxSize } from "class-validator";
import { StoriesService } from "./stories.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class CreatePollDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  options: string[];
}

class VoteDto {
  @IsString()
  optionId: string;
}

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
    return this.storiesService.createStory(req.user.id, file.buffer, file.mimetype);
  }

  @Get("feed")
  @ApiOperation({ summary: "Feed de stories dos criadores que o usuário assina" })
  feed(@Request() req: any) {
    return this.storiesService.getStoriesFeed(req.user.id);
  }

  @Get("creator/:creatorId")
  @ApiOperation({ summary: "Stories de um criador específico" })
  getByCreator(@Param("creatorId") creatorId: string, @Request() req: any) {
    return this.storiesService.getCreatorStories(creatorId, req.user.id);
  }

  @Post(":storyId/view")
  @ApiOperation({ summary: "Registra visualização de um story" })
  recordView(@Param("storyId") storyId: string, @Request() req: any) {
    return this.storiesService.recordView(storyId, req.user.id);
  }

  @Post(":storyId/poll")
  @ApiOperation({ summary: "Criar enquete em um story (criador)" })
  createPoll(
    @Param("storyId") storyId: string,
    @Body() dto: CreatePollDto,
    @Request() req: any,
  ) {
    return this.storiesService.createPoll(storyId, req.user.id, dto.options);
  }

  @Get(":storyId/poll")
  @ApiOperation({ summary: "Resultados da enquete de um story" })
  getPoll(@Param("storyId") storyId: string, @Request() req: any) {
    return this.storiesService.getPollResults(storyId, req.user.id);
  }

  @Post(":storyId/poll/vote")
  @ApiOperation({ summary: "Votar em uma opção da enquete" })
  vote(
    @Param("storyId") storyId: string,
    @Body() dto: VoteDto,
    @Request() req: any,
  ) {
    return this.storiesService.vote(storyId, dto.optionId, req.user.id);
  }
}
