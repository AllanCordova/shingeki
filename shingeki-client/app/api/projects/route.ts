import { forwardFormToApi, forwardToApi } from "@/lib/api/server";
import { isMultipartRequest, readJson, respond } from "@/lib/api/route-helpers";

export async function GET() {
  return respond(await forwardToApi("get", "/projects"));
}

export async function POST(request: Request) {
  if (isMultipartRequest(request)) {
    const formData = await request.formData();
    return respond(await forwardFormToApi("post", "/projects", formData));
  }

  const body = await readJson(request);
  return respond(await forwardToApi("post", "/projects", { body }));
}
