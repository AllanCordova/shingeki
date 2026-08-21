import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { forwardToApi } from "@/lib/api/server";
import { attachAuthCookie } from "@/lib/auth/session-cookie";
import { safeAppPath } from "@/lib/auth/safe-redirect";
import {
  GOOGLE_LOGIN_NONCE_COOKIE,
  GOOGLE_REDIRECT_COOKIE,
} from "@/lib/config";
import type { AuthResponse } from "@/lib/contracts";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;
  const jar = await cookies();
  const redirectParam = jar.get(GOOGLE_REDIRECT_COOKIE)?.value;
  const nonce = jar.get(GOOGLE_LOGIN_NONCE_COOKIE)?.value;

  const safeRedirect = safeAppPath(redirectParam);

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
    if (!auth.token) {
      return fail();
    }

    const response = NextResponse.redirect(`${origin}${safeRedirect}`);
    attachAuthCookie(response, auth.token);
    response.cookies.delete(GOOGLE_REDIRECT_COOKIE);
    response.cookies.delete(GOOGLE_LOGIN_NONCE_COOKIE);

    return response;
  }

  return fail();
}
