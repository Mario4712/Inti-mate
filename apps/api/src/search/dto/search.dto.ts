import {
  IsOptional,
  IsString,
  IsArray,
  IsInt,
  Min,
  Max,
  MaxLength,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class SearchCreatorsDto {
  @ApiPropertyOptional({ description: "Texto livre (nome artístico, bio, tags)" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ description: "Tags separadas por vírgula", type: [String] })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.split(",").map((t: string) => t.trim()) : value))
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: "Categoria (ex: fitness, arte, música)" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ description: "Preço máximo de assinatura mensal (centavos)" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: "País (código ISO 3166-1 alpha-2, ex: BR)" })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
