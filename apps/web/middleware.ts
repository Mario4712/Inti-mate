import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware de autenticação — protege rotas do dashboard.
 *
 * Verifica se o cookie/header contém um token de acesso.
 * Tokens são armazenados no localStorage (client-side), então para
 * o middleware server-side checamos um cookie sincronizado ou
 * simplesmente deixamos o client-side AuthGuard redirecionar.
 *
 * Estratégia: o middleware checa se existe o cookie `has_session`.
 * Esse cookie é setado pelo client-side após login (sem o token real,
 * apenas um flag booleano). O token real permanece no localStorage.
 */

const PROTECTED_PATHS = ["/dashboard", "/creator/earnings", "/settings"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for session flag cookie
  const hasSession = request.cookies.get("has_session")?.value;

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/creator/earnings/:path*", "/settings/:path*"],
};
