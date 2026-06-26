import { forwardToApi } from "@/lib/api/server";
import { readJson, respond } from "@/lib/api/route-helpers";

type Params = {
  params: Promise<{ projectId: string; systemId: string; routeId: string }>;
};

export async function PUT(request: Request, { params }: Params) {
  const { projectId, systemId, routeId } = await params;
  const body = await readJson(request);
  return respond(
    await forwardToApi(
      "put",
      `/projects/${projectId}/systems/${systemId}/manual-proxy/routes/${routeId}`,
      { body },
    ),
  );
}

export async function DELETE(_request: Request, { params }: Params) {
  const { projectId, systemId, routeId } = await params;
  return respond(
    await forwardToApi(
      "delete",
      `/projects/${projectId}/systems/${systemId}/manual-proxy/routes/${routeId}`,
    ),
  );
}
