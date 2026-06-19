import { forwardToApi } from "@/lib/api/server";
import { respond } from "@/lib/api/route-helpers";

type Params = {
  params: Promise<{ projectId: string; systemId: string; dispatchId: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const { projectId, systemId, dispatchId } = await params;
  const query = new URL(request.url).searchParams.toString();
  const path =
    `/projects/${projectId}/systems/${systemId}/system-results/${dispatchId}` +
    (query ? `?${query}` : "");

  return respond(await forwardToApi("get", path));
}

export async function DELETE(_request: Request, { params }: Params) {
  const { projectId, systemId, dispatchId } = await params;
  return respond(
    await forwardToApi(
      "delete",
      `/projects/${projectId}/systems/${systemId}/system-results/${dispatchId}`,
    ),
  );
}
