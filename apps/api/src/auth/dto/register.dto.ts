import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Role } from "@intimare/database";

export class RegisterDto {
  @ApiProperty({ example: "usuario@exemplo.com" })
  @IsEmail({}, { message: "E-mail inválido" })
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: "SenhaForte@123" })
  @IsString()
  @MinLength(8, { message: "A senha deve ter no mínimo 8 caracteres" })
  @MaxLength(72, { message: "A senha deve ter no máximo 72 caracteres" })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])[A-Za-z\d@$!%*?&^#]{8,}$/,
    {
      message:
        "A senha deve conter letras maiúsculas, minúsculas, números e um caractere especial",
    },
  )
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.CONSUMER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ description: "CPF (apenas dígitos)", example: "12345678900" })
  @IsString()
  @Matches(/^\d{11}$/, { message: "CPF inválido — informe apenas os 11 dígitos" })
  cpf: string;

  @ApiPropertyOptional({ description: "Nome artístico público (criadores)" })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  artisticName?: string;

  // Aceite obrigatório dos termos e política de privacidade
  @ApiProperty({ description: "Aceite dos Termos de Uso", example: true })
  @IsNotEmpty({ message: "Você deve aceitar os Termos de Uso" })
  acceptTerms: boolean;

  @ApiProperty({ description: "Aceite da Política de Privacidade", example: true })
  @IsNotEmpty({ message: "Você deve aceitar a Política de Privacidade" })
  acceptPrivacyPolicy: boolean;

  // Declaração de maioridade obrigatória
  @ApiProperty({ description: "Declaração de ser maior de 18 anos", example: true })
  @IsNotEmpty({ message: "Você deve declarar que é maior de 18 anos" })
  declareAdult: boolean;
}
