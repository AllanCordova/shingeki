import { NextResponse } from "next/server";

type Params = { params: Promise<{ ticket: string }> };

/**
 * Same-origin capture must never post the Shingeki Sanctum cookie as target auth.
 * Extension and cooperative capture post credentials directly to the API.
 */
export async function POST(_request: Request, { params }: Params) {
  await params;

  return NextResponse.json(
    {
      message:
        "Use a extensão Shingeki ou a importação manual para conectar a sessão do alvo.",
    },
    { status: 410 },
  );
}
