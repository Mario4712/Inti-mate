import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { VerifiedTierService } from "./verified-tier.service";

/**
 * Guard que protege rotas da seção Acesso Verificado.
 * Aplica após JwtAuthGuard — requer usuário autenticado.
 */
@Injectable()
export class VerifiedTierGuard implements CanActivate {
  constructor(private readonly verifiedTierService: VerifiedTierService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId  = request.user?.sub;

    if (!userId) return false;

    // assertAccess lança ForbiddenException se não tiver acesso
    await this.verifiedTierService.assertAccess(userId);
    return true;
  }
}
