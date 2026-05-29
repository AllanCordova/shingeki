import { NextResponse } from "next/server";
import { forwardToApi } from "@/lib/api/server";
import { readJson } from "@/lib/api/route-helpers";
import { AUTH_COOKIE, AUTH_COOKIE_MAX_AGE } from "@/lib/config";
import type { AuthResponse } from "@/lib/contracts";

export async function POST(request: Request) {
  const body = await readJson(request);
  const { status, data } = await forwardToApi("post", "/auth/register", { body });

  if (status >= 200 && status < 300) {
    const auth = data as AuthResponse;
    const response = NextResponse.json({ user: auth.user, message: auth.message }, { status });

    response.cookies.set(AUTH_COOKIE, auth.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: AUTH_COOKIE_MAX_AGE,
    });

    return response;
  }

  return NextResponse.json(data, { status });
}
