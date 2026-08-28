import { NextResponse } from "next/server";
import { forwardToApi } from "@/lib/api/server";
import { clearAuthCookie } from "@/lib/auth/session-cookie";

export async function POST() {
  try {
    await forwardToApi("post", "/auth/logout");
  } catch {
    // Cookie is cleared even if Laravel is unreachable.
  }

  const response = NextResponse.json({ message: "Sessão encerrada." });
  clearAuthCookie(response);
  return response;
}
