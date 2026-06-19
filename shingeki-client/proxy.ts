import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/config";

/**
 * Proxy (antigo "middleware" — renomeado no Next 16).
 * Protege as rotas privadas: sem cookie de sessao -> redireciona para /login.
 * Usuario ja autenticado em /login ou /registro -> redireciona para /projetos.
 */

const PUBLIC_ROUTES = ["/login", "/registro"];

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE)?.value);
  const isPublic = isPublicRoute(pathname);

  if (!hasSession && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/projetos", request.url));
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Roda em todas as rotas, exceto:
   * - rotas internas de API (/api/*) — protegidas pelo proprio token
   * - assets estaticos do Next e arquivos de metadados
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
