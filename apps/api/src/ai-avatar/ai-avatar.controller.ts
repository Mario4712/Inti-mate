import {
  Controller, Get, Post, Put, Param, Body,
  UseGuards, Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import {
  IsString, IsBoolean, IsInt, IsArray, IsOptional,
  ArrayMaxSize, ArrayMinSize, MaxLength, Min, Max,
} from "class-validator";
import { AiAvatarService } from "./ai-avatar.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class SubmitAssetsDto {
  @IsArray()
  @ArrayMinSize(50)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  photoKeys: string[];

  @IsOptional() @IsString()
  audioKey?: string;
}

class ConfigureAvatarDto {
  @IsBoolean()
  allowFanGeneration: boolean;

  @IsInt() @Min(1) @Max(100)
  maxGenPerDay: number;
}

class GenerateDto {
  @IsString() @MaxLength(500)
  prompt: string;
}

@ApiTags("AI Avatar")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("ai-avatar")
export class AiAvatarController {
  constructor(private readonly service: AiAvatarService) {}

  @Get("consent-text")
  @ApiOperation({ summary: "Retorna o texto de consentimento a ser exibido ao criador" })
  getConsentText() {
    return this.service.getConsentText();
  }

  @Post("init")
  @ApiOperation({ summary: "Inicializa o AI Avatar do criador (requer KYC DOCUMENT)" })
  init(@Request() req: any) {
    return this.service.initAvatar(req.user.sub);
  }

  @Post("consent")
  @ApiOperation({ summary: "Criador aceita o termo de consentimento para treinamento" })
  acceptConsent(@Request() req: any) {
    return this.service.acceptConsent(req.user.sub);
  }

  @Put("assets")
  @ApiOperation({
    summary: "Envia S3 keys das fotos (50–200) e áudio de referência",
    description: "Upload direto para S3 pré-assinado; este endpoint recebe apenas as keys.",
  })
  submitAssets(@Body() dto: SubmitAssetsDto, @Request() req: any) {
    return this.service.submitAssets(req.user.sub, dto.photoKeys, dto.audioKey);
  }

  @Put("config")
  @ApiOperation({ summary: "Configura permissões e limites de geração" })
  configure(@Body() dto: ConfigureAvatarDto, @Request() req: any) {
    return this.service.configureAvatar(req.user.sub, dto.allowFanGeneration, dto.maxGenPerDay);
  }

  @Get("me")
  @ApiOperation({ summary: "Retorna o avatar do criador autenticado" })
  getMyAvatar(@Request() req: any) {
    return this.service.getAvatar(req.user.sub);
  }

  @Get(":avatarId")
  @ApiOperation({ summary: "Info pública de um avatar (status + permissão de fã)" })
  async getPublicInfo(@Param("avatarId") avatarId: string) {
    const a = await this.service["prisma"].aiAvatar.findUnique({
      where:  { id: avatarId },
      select: { id: true, status: true, allowFanGeneration: true, maxGenPerDay: true },
    });
    return a;
  }

  @Post(":avatarId/generate")
  @ApiOperation({
    summary: "Gera variação de conteúdo (criador ou fã autorizado)",
    description: "Output passa obrigatoriamente por CSAM check antes de disponibilizar.",
  })
  generate(
    @Param("avatarId") avatarId: string,
    @Body() dto: GenerateDto,
    @Request() req: any,
  ) {
    return this.service.generate(avatarId, req.user.sub, dto.prompt);
  }

  @Get("generation/:jobId")
  @ApiOperation({ summary: "Consulta status de uma geração" })
  getGeneration(@Param("jobId") jobId: string, @Request() req: any) {
    return this.service.getGeneration(jobId, req.user.sub);
  }

  @Get(":avatarId/generations")
  @ApiOperation({ summary: "Histórico de gerações (apenas criador)" })
  listGenerations(@Param("avatarId") avatarId: string, @Request() req: any) {
    return this.service.listGenerations(avatarId, req.user.sub);
  }
}
