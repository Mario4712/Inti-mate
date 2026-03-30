import {
  Controller, Get, Post, Param, Body, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import {
  IsString, IsOptional, IsIn, IsBoolean, MaxLength,
} from "class-validator";
import { ContentGenService } from "./content-gen.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class CreateJobDto {
  @IsString() @MaxLength(1000)
  prompt: string;

  @IsIn(["background", "effect", "scene"])
  jobType: string;

  @IsOptional() @IsString()
  inputKey?: string; // S3 key do conteúdo base (opcional)
}

class ModerateJobDto {
  @IsBoolean() passed: boolean;
  @IsOptional() @IsString() @MaxLength(500)
  rejectionReason?: string;
}

@ApiTags("Content Generation")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("content-gen")
export class ContentGenController {
  constructor(private readonly service: ContentGenService) {}

  @Post()
  @ApiOperation({
    summary: "Cria job de geração de conteúdo por IA",
    description:
      "Tipos: background (fundo), effect (efeito visual), scene (cena alternativa). " +
      "Limite: 20/dia. Output passa por moderação automática + CSAM check.",
  })
  create(@Body() dto: CreateJobDto, @Request() req: any) {
    return this.service.createJob(req.user.sub, dto.prompt, dto.jobType, dto.inputKey);
  }

  @Get()
  @ApiOperation({ summary: "Lista jobs de geração do criador autenticado" })
  list(
    @Request() req: any,
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.listJobs(req.user.sub, page, limit);
  }

  @Get(":jobId")
  @ApiOperation({ summary: "Status e resultado de um job" })
  getJob(@Param("jobId") jobId: string, @Request() req: any) {
    return this.service.getJob(jobId, req.user.sub);
  }

  @Post(":jobId/moderate")
  @ApiOperation({ summary: "Moderação manual de output pendente (moderadores)" })
  moderate(
    @Param("jobId") jobId: string,
    @Body() dto: ModerateJobDto,
  ) {
    return this.service.moderateJob(jobId, dto.passed, dto.rejectionReason);
  }
}
