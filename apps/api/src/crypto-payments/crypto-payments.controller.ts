import {
  Controller, Get, Post, Param, Body, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe,
  HttpCode, HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { IsString, IsNumber, Min, IsEnum, IsIn } from "class-validator";
import { Type } from "class-transformer";
import { CryptoPaymentsService } from "./crypto-payments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class CreateChargeDto {
  @IsNumber() @Min(10)
  @Type(() => Number)
  amountBRL: number;

  @IsIn(["BTC", "USDC", "USDT"])
  currency: string;
}

class WebhookDto {
  @IsString() providerRef: string;
  @IsEnum(["CONFIRMED", "FAILED"]) status: "CONFIRMED" | "FAILED";
  @IsString() webhookSecret: string; // validado no service em prod
}

@ApiTags("Crypto Payments")
@Controller("crypto-payments")
export class CryptoPaymentsController {
  constructor(private readonly service: CryptoPaymentsService) {}

  @Post("charge")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Cria cobrança em cripto (BTC/USDC/USDT)",
    description: "< R$2k/mês: só email+wallet. >= R$2k/mês: requer KYC DOCUMENT. Monero não aceito.",
  })
  createCharge(@Body() dto: CreateChargeDto, @Request() req: any) {
    return this.service.createCharge(req.user.sub, dto.amountBRL, dto.currency);
  }

  @Get("history")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Histórico de transações cripto do usuário" })
  history(
    @Request() req: any,
    @Query("page",  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.getHistory(req.user.sub, page, limit);
  }

  @Get(":txId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Detalhes de uma transação cripto" })
  getOne(@Param("txId") txId: string, @Request() req: any) {
    return this.service.getTransaction(req.user.sub, txId);
  }

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Webhook do provedor cripto (Coinbase Commerce / BTCPay)",
    description: "Endpoint público — validação HMAC feita no service em produção.",
  })
  webhook(@Body() dto: WebhookDto) {
    // TODO prod: validar assinatura HMAC antes de processar
    return this.service.confirmCharge(dto.providerRef, dto.status);
  }
}
