import "server-only";

import { NextResponse } from "next/server";

/** Converte o resultado de forwardToApi em uma resposta JSON do Next. */
export function respond(result: { status: number; data: unknown }): NextResponse {
  return NextResponse.json(result.data, { status: result.status });
}

/** Le o corpo JSON da requisicao com seguranca (retorna {} se vazio/invalido). */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
