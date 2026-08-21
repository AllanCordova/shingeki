import { forwardToApi } from "@/lib/api/server";
import { readJson, respond } from "@/lib/api/route-helpers";

type Params = { params: Promise<{ projectId: string; systemId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { projectId, systemId } = await params;
  return respond(
    await forwardToApi(
      "get",
      `/projects/${projectId}/systems/${systemId}/target-session`,
    ),
  );
}

export async function POST(request: Request, { params }: Params) {
  const { projectId, systemId } = await params;
  const body = await readJson(request);
  return respond(
    await forwardToApi(
      "post",
      `/projects/${projectId}/systems/${systemId}/target-session`,
      { body },
    ),
  );
}

export async function DELETE(_request: Request, { params }: Params) {
  const { projectId, systemId } = await params;
  return respond(
    await forwardToApi(
      "delete",
      `/projects/${projectId}/systems/${systemId}/target-session`,
    ),
  );
}
