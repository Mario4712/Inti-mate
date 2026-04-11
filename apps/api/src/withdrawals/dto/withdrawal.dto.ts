import { IsEnum, IsInt, IsString, Min, Matches } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class RequestWithdrawalDto {
  @ApiProperty({ description: "Valor em centavos (mínimo R$ 20,00 = 2000)", example: 5000 })
  @Type(() => Number)
  @IsInt()
  @Min(2000, { message: "Valor mínimo para saque: R$ 20,00" })
  amount: number;

  @ApiProperty({ description: "Chave PIX", example: "usuario@email.com" })
  @IsString()
  pixKey: string;

  @ApiProperty({ enum: ["CPF", "EMAIL", "PHONE", "EVP"] })
  @IsEnum(["CPF", "EMAIL", "PHONE", "EVP"])
  pixKeyType: "CPF" | "EMAIL" | "PHONE" | "EVP";
}
