import {
  Controller, Get, Post, Param, Body, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe,
  HttpCode, HttpStatus, Headers, Req, UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { IsNumber, Min, IsIn } from "class-validator";
import { Type } from "class-transformer";
import * as crypto from "crypto";
import { CryptoPaymentsService } from "./crypto-payments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class CreateChargeDto {
  @IsNumber() @Min(10)
  @Type(() => Number)
  amountBRL: number;

  @IsIn(["BTC", "USDC", "USDT"])
  currency: string;
}

@ApiTags("Crypto Payments")
@Controller("crypto-payments")
export class CryptoPaymentsController {
  constructor(
    private readonly service: CryptoPaymentsService,
    private readonly config: ConfigService,
  ) {}

  @Post("charge")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Cria cobrança em cripto (BTC/USDC/USDT)",
    description: "< R$2k/mês: só email+wallet. >= R$2k/mês: requer KYC DOCUMENT. Monero não aceito.",
  })
  createCharge(@Body() dto: CreateChargeDto, @Request() req: any) {
    return this.service.createCharge(req.user.id, dto.amountBRL, dto.currency);
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
    return this.service.getHistory(req.user.id, page, limit);
  }

  @Get(":txId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Detalhes de uma transação cripto" })
  getOne(@Param("txId") txId: string, @Request() req: any) {
    return this.service.getTransaction(req.user.id, txId);
  }

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Webhook do provedor cripto (Coinbase Commerce / BTCPay)",
    description: "Endpoint público — validação HMAC via header x-webhook-signature.",
  })
  webhook(@Req() req: any, @Headers("x-webhook-signature") signature: string) {
    const body = JSON.stringify(req.body);
    const secret = this.config.get<string>("app.crypto.webhookSecret");

    if (secret && process.env.NODE_ENV === "production") {
      const expected = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");
      if (!signature || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
        throw new UnauthorizedException("Invalid webhook signature");
      }
    }

    const { providerRef, status } = req.body;
    return this.service.confirmCharge(providerRef, status);
  }
}
