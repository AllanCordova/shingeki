import { forwardFormToApi, forwardToApi } from "@/lib/api/server";
import { isMultipartRequest, readJson, respond } from "@/lib/api/route-helpers";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  return respond(await forwardToApi("get", `/projects/${projectId}`));
}

export async function PUT(request: Request, { params }: Params) {
  const { projectId } = await params;

  if (isMultipartRequest(request)) {
    const formData = await request.formData();
    return respond(
      await forwardFormToApi("put", `/projects/${projectId}`, formData),
    );
  }

  const body = await readJson(request);
  return respond(
    await forwardToApi("put", `/projects/${projectId}`, { body }),
  );
}

export async function DELETE(_request: Request, { params }: Params) {
  const { projectId } = await params;
  return respond(await forwardToApi("delete", `/projects/${projectId}`));
}
