import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsObject, Min, Max } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdatePreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ description: "Tipos de notificação desabilitados" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disabledTypes?: string[];

  @ApiPropertyOptional({ description: "Máximo de notificações push por dia" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxPerDay?: number;
}

export class RegisterPushDto {
  @ApiProperty()
  @IsString()
  endpoint: string;

  @ApiProperty()
  @IsObject()
  keys: { p256dh: string; auth: string };
}
