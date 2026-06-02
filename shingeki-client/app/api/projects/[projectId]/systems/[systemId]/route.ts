import { forwardFormToApi, forwardToApi } from "@/lib/api/server";
import { isMultipartRequest, readJson, respond } from "@/lib/api/route-helpers";

type Params = { params: Promise<{ projectId: string; systemId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { projectId, systemId } = await params;
  return respond(
    await forwardToApi("get", `/projects/${projectId}/systems/${systemId}`),
  );
}

export async function PUT(request: Request, { params }: Params) {
  const { projectId, systemId } = await params;

  if (isMultipartRequest(request)) {
    const formData = await request.formData();
    return respond(
      await forwardFormToApi(
        "put",
        `/projects/${projectId}/systems/${systemId}`,
        formData,
      ),
    );
  }

  const body = await readJson(request);
  return respond(
    await forwardToApi("put", `/projects/${projectId}/systems/${systemId}`, {
      body,
    }),
  );
}

export async function DELETE(_request: Request, { params }: Params) {
  const { projectId, systemId } = await params;
  return respond(
    await forwardToApi(
      "delete",
      `/projects/${projectId}/systems/${systemId}`,
    ),
  );
}
