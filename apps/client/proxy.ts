import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { publicOrigin } from "@/lib/auth/public-origin";
import { AUTH_COOKIE } from "@/lib/config";

const PUBLIC_ROUTES = ["/login", "/registro"];

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/conectar-alvo")) return true;
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE)?.value);
  const isPublic = isPublicRoute(pathname);

  if (!hasSession && !isPublic) {
    const loginUrl = new URL("/login", publicOrigin(request));
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/projetos", publicOrigin(request)));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
