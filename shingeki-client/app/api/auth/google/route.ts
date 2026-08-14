import { NextResponse } from "next/server";
import {
  API_BASE_URL,
  GOOGLE_LOGIN_NONCE_COOKIE,
  GOOGLE_REDIRECT_COOKIE,
  GOOGLE_REDIRECT_COOKIE_MAX_AGE,
} from "@/lib/config";

/**
 * Starts Google OIDC login by redirecting the browser to the Laravel
 * authorization endpoint (Authorization Code + ID Token flow).
 * Sets a browser nonce so the later handoff exchange cannot be stolen.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirect = url.searchParams.get("redirect");
  const nonce = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");

  const target = new URL(`${API_BASE_URL}/auth/google/redirect`);
  target.searchParams.set("origin", url.origin);
  target.searchParams.set("nonce", nonce);

  const response = NextResponse.redirect(target.toString());

  response.cookies.set(GOOGLE_LOGIN_NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GOOGLE_REDIRECT_COOKIE_MAX_AGE,
  });

  if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
    response.cookies.set(GOOGLE_REDIRECT_COOKIE, redirect, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GOOGLE_REDIRECT_COOKIE_MAX_AGE,
    });
  } else {
    response.cookies.delete(GOOGLE_REDIRECT_COOKIE);
  }

  return response;
}
