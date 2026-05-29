import { forwardToApi } from "@/lib/api/server";
import { readJson, respond } from "@/lib/api/route-helpers";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  return respond(await forwardToApi("get", `/projects/${projectId}/systems`));
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const body = await readJson(request);
  return respond(
    await forwardToApi("post", `/projects/${projectId}/systems`, { body }),
  );
}
