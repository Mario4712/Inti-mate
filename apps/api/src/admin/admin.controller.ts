import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, DefaultValuePipe, ParseIntPipe, HttpCode, HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Role } from "@intimare/database";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";

class BanUserDto {
  @ApiProperty({ description: "Motivo do banimento" })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

class RejectKycDto {
  @ApiProperty({ description: "Motivo da rejeição do KYC" })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

class ProcessWithdrawalDto {
  @ApiProperty({ enum: ["COMPLETED", "FAILED"] })
  @IsEnum(["COMPLETED", "FAILED"])
  status: "COMPLETED" | "FAILED";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  failureReason?: string;
}

class ChangeRoleDto {
  @ApiProperty({ enum: ["CONSUMER", "CREATOR", "MODERATOR", "ADMIN"] })
  @IsEnum(["CONSUMER", "CREATOR", "MODERATOR", "ADMIN"])
  role: "CONSUMER" | "CREATOR" | "MODERATOR" | "ADMIN";
}

@ApiTags("Admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller({ path: "admin", version: "1" })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ───────────────────────────────────────────

  @Get("dashboard")
  @ApiOperation({ summary: "Métricas gerais da plataforma" })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // ─── Usuários ─────────────────────────────────────────────

  @Get("users")
  @ApiOperation({ summary: "Listar todos os usuários" })
  @ApiQuery({ name: "page",   required: false, type: Number })
  @ApiQuery({ name: "limit",  required: false, type: Number })
  @ApiQuery({ name: "role",   required: false, enum: ["CONSUMER", "CREATOR", "MODERATOR", "ADMIN"] })
  @ApiQuery({ name: "status", required: false, enum: ["ACTIVE", "SUSPENDED", "BANNED"] })
  @ApiQuery({ name: "q",      required: false, type: String, description: "Busca por username/email" })
  listUsers(
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("role")   role?:   string,
    @Query("status") status?: string,
    @Query("q")      q?:      string,
  ) {
    return this.adminService.listUsers({ page, limit, role, status, q });
  }

  @Get("users/:userId")
  @ApiOperation({ summary: "Detalhes de um usuário" })
  getUser(@Param("userId") userId: string) {
    return this.adminService.getUser(userId);
  }

  @Patch("users/:userId/ban")
  @ApiOperation({ summary: "Banir usuário" })
  banUser(
    @Param("userId") userId: string,
    @Body() dto: BanUserDto,
    @CurrentUser("id") adminId: string,
  ) {
    return this.adminService.banUser(userId, dto.reason, adminId);
  }

  @Patch("users/:userId/unban")
  @ApiOperation({ summary: "Desbanir usuário" })
  unbanUser(
    @Param("userId") userId: string,
    @CurrentUser("id") adminId: string,
  ) {
    return this.adminService.unbanUser(userId, adminId);
  }

  @Patch("users/:userId/role")
  @ApiOperation({ summary: "Alterar role do usuário" })
  changeRole(
    @Param("userId") userId: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser("id") adminId: string,
  ) {
    return this.adminService.changeRole(userId, dto.role, adminId);
  }

  // ─── KYC ─────────────────────────────────────────────────

  @Get("kyc")
  @ApiOperation({ summary: "Fila de KYC pendentes" })
  @ApiQuery({ name: "page",   required: false, type: Number })
  @ApiQuery({ name: "limit",  required: false, type: Number })
  @ApiQuery({ name: "status", required: false, enum: ["PENDING", "APPROVED", "REJECTED"] })
  listKyc(
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("status") status?: string,
  ) {
    return this.adminService.listKyc({ page, limit, status });
  }

  @Patch("kyc/:userId/approve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Aprovar KYC de um usuário" })
  approveKyc(
    @Param("userId") userId: string,
    @CurrentUser("id") adminId: string,
  ) {
    return this.adminService.approveKyc(userId, adminId);
  }

  @Patch("kyc/:userId/reject")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rejeitar KYC de um usuário" })
  rejectKyc(
    @Param("userId") userId: string,
    @Body() dto: RejectKycDto,
    @CurrentUser("id") adminId: string,
  ) {
    return this.adminService.rejectKyc(userId, dto.reason, adminId);
  }

  // ─── Saques ──────────────────────────────────────────────

  @Get("withdrawals")
  @ApiOperation({ summary: "Listar solicitações de saque" })
  @ApiQuery({ name: "page",   required: false, type: Number })
  @ApiQuery({ name: "limit",  required: false, type: Number })
  @ApiQuery({ name: "status", required: false, enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"] })
  listWithdrawals(
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("status") status?: string,
  ) {
    return this.adminService.listWithdrawals({ page, limit, status });
  }

  @Patch("withdrawals/:withdrawalId/process")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Processar saque (marcar como concluído ou falhou)" })
  processWithdrawal(
    @Param("withdrawalId") withdrawalId: string,
    @Body() dto: ProcessWithdrawalDto,
    @CurrentUser("id") adminId: string,
  ) {
    return this.adminService.processWithdrawal(withdrawalId, dto.status, adminId, dto.failureReason);
  }

  // ─── Conteúdo / Denúncias ────────────────────────────────

  @Get("reports")
  @ApiOperation({ summary: "Denúncias de usuários" })
  @ApiQuery({ name: "page",   required: false, type: Number })
  @ApiQuery({ name: "limit",  required: false, type: Number })
  @ApiQuery({ name: "status", required: false, enum: ["PENDING", "RESOLVED"] })
  listReports(
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("status") status?: string,
  ) {
    return this.adminService.listReports({ page, limit, status });
  }

  @Patch("reports/:reportId/resolve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Marcar denúncia como resolvida" })
  resolveReport(
    @Param("reportId") reportId: string,
    @CurrentUser("id") adminId: string,
  ) {
    return this.adminService.resolveReport(reportId, adminId);
  }

  @Get("content")
  @ApiOperation({ summary: "Listar conteúdos por status de moderação" })
  @ApiQuery({ name: "page",   required: false, type: Number })
  @ApiQuery({ name: "limit",  required: false, type: Number })
  @ApiQuery({ name: "status", required: false, enum: ["PENDING_REVIEW", "APPROVED", "REJECTED", "FLAGGED"] })
  listContent(
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("status") status?: string,
  ) {
    return this.adminService.listContent({ page, limit, status });
  }

  @Patch("content/:mediaId/approve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Aprovar conteúdo manualmente" })
  approveContent(
    @Param("mediaId") mediaId: string,
    @CurrentUser("id") adminId: string,
  ) {
    return this.adminService.moderateContent(mediaId, "APPROVED", adminId);
  }

  @Patch("content/:mediaId/reject")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rejeitar conteúdo manualmente" })
  rejectContent(
    @Param("mediaId") mediaId: string,
    @Body() dto: RejectKycDto,
    @CurrentUser("id") adminId: string,
  ) {
    return this.adminService.moderateContent(mediaId, "REJECTED", adminId, dto.reason);
  }
}
