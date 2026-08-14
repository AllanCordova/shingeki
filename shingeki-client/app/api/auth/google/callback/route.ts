import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { forwardToApi } from "@/lib/api/server";
import {
  AUTH_COOKIE,
  AUTH_COOKIE_MAX_AGE,
  GOOGLE_LOGIN_NONCE_COOKIE,
  GOOGLE_REDIRECT_COOKIE,
} from "@/lib/config";
import type { AuthResponse } from "@/lib/contracts";

/**
 * Completes Google OIDC login: exchanges the one-time handoff code + browser
 * nonce for a Sanctum token and sets the http-only session cookie.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;
  const jar = await cookies();
  const redirectParam = jar.get(GOOGLE_REDIRECT_COOKIE)?.value;
  const nonce = jar.get(GOOGLE_LOGIN_NONCE_COOKIE)?.value;

  const safeRedirect =
    redirectParam &&
    redirectParam.startsWith("/") &&
    !redirectParam.startsWith("//")
      ? redirectParam
      : "/projetos";

  const fail = () => {
    const response = NextResponse.redirect(
      `${origin}/login?error=google_auth_failed`,
    );
    response.cookies.delete(GOOGLE_REDIRECT_COOKIE);
    response.cookies.delete(GOOGLE_LOGIN_NONCE_COOKIE);
    return response;
  };

  if (!code || !nonce) {
    return fail();
  }

  const { status, data } = await forwardToApi("post", "/auth/google/exchange", {
    body: { code, nonce },
  });

  if (status >= 200 && status < 300) {
    const auth = data as AuthResponse;
    const response = NextResponse.redirect(`${origin}${safeRedirect}`);

    response.cookies.set(AUTH_COOKIE, auth.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: AUTH_COOKIE_MAX_AGE,
    });
    response.cookies.delete(GOOGLE_REDIRECT_COOKIE);
    response.cookies.delete(GOOGLE_LOGIN_NONCE_COOKIE);

    return response;
  }

  return fail();
}
