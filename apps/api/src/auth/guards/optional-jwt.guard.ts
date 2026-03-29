import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Guard que aceita JWT quando presente, mas não rejeita requisições sem token.
 * Útil para endpoints públicos que exibem conteúdo diferente para usuários autenticados.
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard("jwt") {
  handleRequest(_err: any, user: any) {
    // Retorna o user se autenticado, null caso contrário (nunca lança exceção)
    return user ?? null;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
