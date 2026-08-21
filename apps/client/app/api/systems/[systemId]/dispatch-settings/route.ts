import { forwardToApi } from "@/lib/api/server";
import { readJson, respond } from "@/lib/api/route-helpers";

type Params = { params: Promise<{ systemId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { systemId } = await params;
  const body = await readJson(request);
  return respond(
    await forwardToApi("put", `/systems/${systemId}/dispatch-settings`, {
      body,
    }),
  );
}
