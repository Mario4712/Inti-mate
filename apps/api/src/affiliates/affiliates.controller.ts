import {
  Controller, Get, Post, Body, UseGuards, Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { AffiliatesService } from "./affiliates.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

class RegisterAffiliateDto {
  @IsOptional()
  @IsString()
  referredByCode?: string;   // ID do afiliado que recrutou (para comissão L2)
}

@ApiTags("Affiliates")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("affiliates")
export class AffiliatesController {
  constructor(private readonly service: AffiliatesService) {}

  @Post("register")
  @ApiOperation({ summary: "Cadastra usuário como afiliado (KYC obrigatório)" })
  register(@Body() dto: RegisterAffiliateDto, @Request() req: any) {
    return this.service.register(req.user.id, dto.referredByCode);
  }

  @Get("dashboard")
  @ApiOperation({ summary: "Dashboard de comissões: saldo pendente, pago, histórico" })
  dashboard(@Request() req: any) {
    return this.service.getDashboard(req.user.id);
  }
}
