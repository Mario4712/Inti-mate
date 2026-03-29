import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: "Nome artístico público (único na plataforma)" })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: "Nome artístico só pode conter letras, números, ponto, underscore e hífen",
  })
  artisticName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;

  @ApiPropertyOptional({ description: "Biografia pública" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ description: "Cidade (apenas para exibição, se showLocation=true)" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: "Estado (UF)" })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @ApiPropertyOptional({ description: "Exibir localização publicamente (opt-in)" })
  @IsOptional()
  @IsBoolean()
  showLocation?: boolean;

  @ApiPropertyOptional({ description: "Perfil público ou privado" })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
