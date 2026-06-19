import { forwardToApi } from "@/lib/api/server";
import { respond } from "@/lib/api/route-helpers";

export async function GET() {
  return respond(await forwardToApi("get", "/catalog/attacks"));
}

export async function POST(request: Request) {
  const body = await request.json();
  return respond(await forwardToApi("post", "/catalog/attacks", { body }));
}
