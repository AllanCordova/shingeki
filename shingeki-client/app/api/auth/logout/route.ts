import { NextResponse } from "next/server";
import { forwardToApi } from "@/lib/api/server";
import { AUTH_COOKIE } from "@/lib/config";

export async function POST() {
  // Tenta invalidar o token na API (best-effort); ignora falhas.
  try {
    await forwardToApi("post", "/auth/logout");
  } catch {
    // segue limpando o cookie de qualquer forma
  }

  const response = NextResponse.json({ message: "Sessao encerrada." });
  response.cookies.delete(AUTH_COOKIE);
  return response;
}
