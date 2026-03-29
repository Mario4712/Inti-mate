import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePlanDto {
  @ApiProperty({ example: "VIP" })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Preço mensal em centavos (R$ 9,90 = 990)", example: 990 })
  @IsInt()
  @Min(500)   // mínimo R$ 5,00
  @Max(100000) // máximo R$ 1.000,00
  priceMonthly: number;

  @ApiPropertyOptional({ description: "Preço trimestral em centavos" })
  @IsOptional()
  @IsInt()
  @Min(500)
  priceQuarterly?: number;

  @ApiPropertyOptional({ description: "Preço anual em centavos" })
  @IsOptional()
  @IsInt()
  @Min(500)
  priceYearly?: number;

  @ApiPropertyOptional({ description: "Limite de assinantes (null = ilimitado)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSlots?: number;
}

export class SubscribeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({ enum: ["pagarme", "stripe"], example: "pagarme" })
  @IsEnum(["pagarme", "stripe"])
  provider: "pagarme" | "stripe";

  @ApiProperty({ description: "Token de pagamento gerado pelo SDK do gateway" })
  @IsString()
  @IsNotEmpty()
  paymentToken: string;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ description: "Motivo do cancelamento" })
  @IsOptional()
  @IsString()
  reason?: string;
}
