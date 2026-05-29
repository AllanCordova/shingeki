import { forwardToApi } from "@/lib/api/server";
import { readJson, respond } from "@/lib/api/route-helpers";

export async function GET() {
  return respond(await forwardToApi("get", "/projects"));
}

export async function POST(request: Request) {
  const body = await readJson(request);
  return respond(await forwardToApi("post", "/projects", { body }));
}
