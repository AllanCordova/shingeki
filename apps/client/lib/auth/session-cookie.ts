import "server-only";

import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_COOKIE_MAX_AGE } from "@/lib/config";
import type { AuthResponse } from "@/lib/contracts";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: AUTH_COOKIE_MAX_AGE,
  };
}

export function attachAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE, token, cookieOptions());
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE, "", {
    ...cookieOptions(),
    maxAge: 0,
  });
}

export function jsonWithAuthCookie(auth: AuthResponse, status: number) {
  const response = NextResponse.json(
    { user: auth.user, message: auth.message },
    { status },
  );
  attachAuthCookie(response, auth.token);
  return response;
}
