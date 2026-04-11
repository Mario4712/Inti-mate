import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { KycService } from "./kyc.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@ApiTags("Usuários")
@Controller({ path: "users", version: "1" })
export class UsersController {
  constructor(
    private usersService: UsersService,
    private kycService: KycService,
  ) {}

  // ─── Perfil público ──────────────────────────────────────

  @Get("profile/:artisticName")
  @ApiOperation({ summary: "Perfil público de um criador (por nome artístico)" })
  getPublicProfile(@Param("artisticName") artisticName: string) {
    return this.usersService.getPublicProfile(artisticName);
  }

  @Get("creator/:username")
  @ApiOperation({ summary: "Perfil público de um criador (por username — usado pelo SEO)" })
  getCreatorByUsername(@Param("username") username: string) {
    return this.usersService.getCreatorByUsername(username);
  }

  @Get("creators/sitemap")
  @ApiOperation({ summary: "Lista criadores ativos para geração do sitemap.xml" })
  getCreatorsForSitemap() {
    return this.usersService.getCreatorsForSitemap();
  }

  // ─── Perfil privado ──────────────────────────────────────

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Meu perfil completo" })
  getMyProfile(@CurrentUser("id") userId: string) {
    return this.usersService.getMyProfile(userId);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Atualizar meu perfil" })
  updateProfile(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  // ─── Upload avatar / capa ────────────────────────────────

  @Post("me/avatar")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Atualizar foto de perfil" })
  uploadAvatar(
    @CurrentUser("id") userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(userId, file);
  }

  @Post("me/cover")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Atualizar foto de capa / banner" })
  uploadCover(
    @CurrentUser("id") userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadCover(userId, file);
  }

  // ─── KYC ─────────────────────────────────────────────────

  @Get("me/kyc/status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Status da verificação de identidade" })
  getKycStatus(@CurrentUser("id") userId: string) {
    return this.kycService.getStatus(userId);
  }

  @Post("me/kyc/submit")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Enviar documentos para KYC (criadores)" })
  submitKyc(@CurrentUser("id") userId: string, @Body() body: any) {
    return this.kycService.submitDocuments(userId, body);
  }

  // ─── LGPD ────────────────────────────────────────────────

  @Post("me/data-deletion")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Solicitar exclusão de dados (direito LGPD)" })
  requestDeletion(@CurrentUser("id") userId: string) {
    return this.usersService.requestDataDeletion(userId);
  }

  @Delete("me/data-deletion")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cancelar solicitação de exclusão de dados" })
  cancelDeletion(@CurrentUser("id") userId: string) {
    return this.usersService.cancelDataDeletion(userId);
  }

  @Get("me/data-export")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Exportar meus dados (portabilidade LGPD)" })
  exportData(@CurrentUser("id") userId: string) {
    return this.usersService.exportMyData(userId);
  }
}
