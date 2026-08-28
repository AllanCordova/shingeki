import { forwardToApi } from "@/lib/api/server";
import { forwardGetWithQuery, readJson, respond } from "@/lib/api/route-helpers";

export async function GET(request: Request) {
  return forwardGetWithQuery(request, "/catalog/remediations");
}

export async function POST(request: Request) {
  const body = await readJson(request);
  return respond(await forwardToApi("post", "/catalog/remediations", { body }));
}
