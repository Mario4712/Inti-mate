import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { GoogleStrategy } from "./strategies/google.strategy";
import {
  ConfirmPasswordChangeDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RequestPasswordChangeDto,
  ResetPasswordDto,
  VerifyEmailDto,
  VerifyTotpDto,
} from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";

@ApiTags("Auth")
@Controller({ path: "auth", version: "1" })
export class AuthController {
  constructor(
    private authService: AuthService,
    private googleStrategy: GoogleStrategy,
  ) {}

  // ─── Registro ────────────────────────────────────────────

  @Post("register")
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Cadastrar novo usuário" })
  @ApiResponse({ status: 201, description: "Usuário criado. Verifique seu e-mail." })
  @ApiResponse({ status: 409, description: "E-mail ou CPF já cadastrado" })
  register(
    @Body() dto: RegisterDto,
    @Ip() ip: string,
    @Req() req: any,
  ) {
    return this.authService.register(dto, ip, req.headers["user-agent"]);
  }

  // ─── Login ───────────────────────────────────────────────

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Login" })
  @ApiResponse({ status: 200, description: "Tokens de acesso e refresh" })
  @ApiResponse({ status: 401, description: "Credenciais inválidas" })
  login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Req() req: any,
  ) {
    return this.authService.login(dto, ip, req.headers["user-agent"]);
  }

  // ─── Refresh ─────────────────────────────────────────────

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Renovar access token via refresh token" })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  // ─── Logout ──────────────────────────────────────────────

  @Delete("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Encerrar sessão" })
  logout(@CurrentUser() user: { id: string; sessionId: string; jti: string }) {
    return this.authService.logout(user.id, user.sessionId, user.jti, 900);
  }

  // ─── Verificação de e-mail ───────────────────────────────

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verificar e-mail com token recebido" })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post("resend-verification")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ auth: { limit: 3, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reenviar e-mail de verificação" })
  async resendVerification(@CurrentUser() user: { id: string; email: string }) {
    await this.authService.sendEmailVerification(user.id, user.email);
  }

  // ─── 2FA ─────────────────────────────────────────────────

  @Post("2fa/setup")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Iniciar configuração de 2FA — retorna QR Code" })
  setupTwoFactor(@CurrentUser() user: { id: string }) {
    return this.authService.setupTwoFactor(user.id);
  }

  @Post("2fa/confirm")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirmar e ativar 2FA com primeiro código TOTP" })
  confirmTwoFactor(
    @CurrentUser() user: { id: string },
    @Body() dto: VerifyTotpDto,
  ) {
    return this.authService.confirmTwoFactor(user.id, dto.code);
  }

  @Delete("2fa/disable")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Desabilitar 2FA" })
  disableTwoFactor(
    @CurrentUser() user: { id: string },
    @Body() dto: VerifyTotpDto,
  ) {
    return this.authService.disableTwoFactor(user.id, dto.code);
  }

  // ─── Change password (autenticado, requer confirmação por e-mail) ─

  @Post("change-password/request")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ auth: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: "Solicitar troca de senha (envia e-mail de confirmação)" })
  requestPasswordChange(
    @Body() dto: RequestPasswordChangeDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.authService.requestPasswordChange(user.id, dto.currentPassword);
  }

  @Post("change-password/confirm")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirmar nova senha com token do e-mail" })
  confirmPasswordChange(@Body() dto: ConfirmPasswordChangeDto) {
    return this.authService.confirmPasswordChange(dto.token, dto.newPassword);
  }

  // ─── Forgot / Reset password ──────────────────────────────

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: "Solicitar reset de senha" })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Redefinir senha com token" })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // ─── OAuth2 / Social Login ──────────────────────────────

  @Post("google")
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Login via Google (ID token)" })
  async googleLogin(
    @Body() body: { idToken: string },
    @Ip() ip: string,
    @Req() req: any,
  ) {
    const profile = await this.googleStrategy.validateIdToken(body.idToken);
    if (!profile) {
      throw new (await import("@nestjs/common")).UnauthorizedException("Token Google invalido");
    }
    return this.authService.loginOrRegisterSocial(
      "google",
      profile.id,
      profile.email,
      profile.name,
      profile.picture,
      ip,
      req.headers["user-agent"],
    );
  }

  // ─── Perfil do usuário logado ────────────────────────────

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Dados do usuário autenticado" })
  me(@CurrentUser() user: any) {
    return user;
  }
}
