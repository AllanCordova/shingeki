import { NextResponse } from "next/server";
import { safeAppPath } from "@/lib/auth/safe-redirect";
import {
  API_BASE_URL,
  GOOGLE_LOGIN_NONCE_COOKIE,
  GOOGLE_REDIRECT_COOKIE,
  GOOGLE_REDIRECT_COOKIE_MAX_AGE,
} from "@/lib/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirect = safeAppPath(url.searchParams.get("redirect"), "");
  const nonce =
    crypto.randomUUID().replaceAll("-", "") +
    crypto.randomUUID().replaceAll("-", "");

  const target = new URL(`${API_BASE_URL}/auth/google/redirect`);
  target.searchParams.set("origin", url.origin);
  target.searchParams.set("nonce", nonce);

  const response = NextResponse.redirect(target.toString());
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: GOOGLE_REDIRECT_COOKIE_MAX_AGE,
  };

  response.cookies.set(GOOGLE_LOGIN_NONCE_COOKIE, nonce, cookieOptions);

  if (redirect) {
    response.cookies.set(GOOGLE_REDIRECT_COOKIE, redirect, cookieOptions);
  } else {
    response.cookies.delete(GOOGLE_REDIRECT_COOKIE);
  }

  return response;
}
