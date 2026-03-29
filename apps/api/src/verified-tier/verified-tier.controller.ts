import {
  Controller, Get, Post, Delete, UseGuards, Request,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { VerifiedTierService } from "./verified-tier.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Verified Tier")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("verified-tier")
export class VerifiedTierController {
  constructor(private readonly service: VerifiedTierService) {}

  @Get("status")
  @ApiOperation({ summary: "Verifica se o usuário tem Acesso Verificado ativo" })
  status(@Request() req: any) {
    return this.service.getStatus(req.user.sub);
  }

  @Post("request")
  @ApiOperation({
    summary: "Solicita ativação do Acesso Verificado (KYC completo obrigatório)",
    description:
      "Ativa acesso à seção premium. Conteúdo nesta seção passa por moderação humana REFORÇADA, não reduzida. CSAM scan continua obrigatório em todos os uploads.",
  })
  requestAccess(@Request() req: any) {
    return this.service.requestAccess(req.user.sub);
  }

  @Delete("revoke")
  @ApiOperation({ summary: "Revoga o próprio Acesso Verificado" })
  revokeOwn(@Request() req: any) {
    return this.service.revokeAccess(req.user.sub, "Revogado pelo próprio usuário");
  }
}
