import { forwardToApi } from "@/lib/api/server";
import { readJson, respond } from "@/lib/api/route-helpers";

export async function GET() {
  return respond(await forwardToApi("get", "/auth/me"));
}

export async function PUT(request: Request) {
  const body = await readJson(request);
  return respond(await forwardToApi("put", "/auth/me", { body }));
}
