import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePpvDto {
  @ApiProperty({ example: "Ensaio especial de verão" })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: "Preço em centavos (R$ 19,90 = 1990)", example: 1990 })
  @IsInt()
  @Min(100)
  @Max(500000)
  price: number;
}

export class PurchasePpvDto {
  @ApiProperty({ enum: ["pagarme", "stripe"] })
  @IsEnum(["pagarme", "stripe"])
  provider: "pagarme" | "stripe";

  @ApiProperty({ description: "Token de pagamento gerado pelo SDK do gateway" })
  @IsString()
  @IsNotEmpty()
  paymentToken: string;
}
