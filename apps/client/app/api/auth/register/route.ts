import { NextResponse } from "next/server";
import { forwardToApi } from "@/lib/api/server";
import { readJson } from "@/lib/api/route-helpers";
import { jsonWithAuthCookie } from "@/lib/auth/session-cookie";
import type { AuthResponse } from "@/lib/contracts";

export async function POST(request: Request) {
  const body = await readJson(request);
  const { status, data } = await forwardToApi("post", "/auth/register", { body });

  if (status >= 200 && status < 300) {
    const auth = data as AuthResponse;
    if (!auth.token) {
      return NextResponse.json(
        { message: "Nao foi possivel iniciar a sessao." },
        { status: 502 },
      );
    }
    return jsonWithAuthCookie(auth, status);
  }

  return NextResponse.json(data, { status });
}
