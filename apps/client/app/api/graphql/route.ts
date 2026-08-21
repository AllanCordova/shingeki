import { forwardToGraphql } from "@/lib/api/server";
import { readJson, respond } from "@/lib/api/route-helpers";

export async function POST(request: Request) {
  const body = await readJson(request);
  return respond(await forwardToGraphql(body));
}
