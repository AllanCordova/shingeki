import { forwardFormToApi, forwardToApi } from "@/lib/api/server";
import { isMultipartRequest, readJson, respond } from "@/lib/api/route-helpers";

export async function GET() {
  return respond(await forwardToApi("get", "/auth/me"));
}

export async function PUT(request: Request) {
  if (isMultipartRequest(request)) {
    const formData = await request.formData();
    return respond(await forwardFormToApi("put", "/auth/me", formData));
  }

  const body = await readJson(request);
  return respond(await forwardToApi("put", "/auth/me", { body }));
}
