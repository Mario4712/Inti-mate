import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "usuario@exemplo.com" })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;

  @ApiPropertyOptional({ description: "Código TOTP (se 2FA habilitado)" })
  @IsOptional()
  @IsString()
  totpCode?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  token: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: "usuario@exemplo.com" })
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}

export class VerifyTotpDto {
  @ApiProperty({ description: "Código de 6 dígitos do authenticator" })
  @IsString()
  code: string;
}

export class RequestPasswordChangeDto {
  @ApiProperty({ description: "Senha atual para confirmar identidade" })
  @IsString()
  @MinLength(1)
  currentPassword: string;
}

export class ConfirmPasswordChangeDto {
  @ApiProperty({ description: "Token recebido por e-mail" })
  @IsString()
  token: string;

  @ApiProperty({ description: "Nova senha" })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}
