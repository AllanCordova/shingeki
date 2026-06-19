import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { forwardToApi } from "@/lib/api/server";
import { respond } from "@/lib/api/route-helpers";
import { AUTH_COOKIE } from "@/lib/config";

type Params = { params: Promise<{ ticket: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { ticket } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  return respond(
    await forwardToApi("post", `/target-session/capture/${ticket}`, {
      body: { authorization: `Bearer ${token}` },
    }),
  );
}
