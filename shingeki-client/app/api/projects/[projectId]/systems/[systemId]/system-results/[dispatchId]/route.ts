import { forwardToApi } from "@/lib/api/server";
import { respond } from "@/lib/api/route-helpers";

type Params = {
  params: Promise<{ projectId: string; systemId: string; dispatchId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { projectId, systemId, dispatchId } = await params;
  return respond(
    await forwardToApi(
      "get",
      `/projects/${projectId}/systems/${systemId}/system-results/${dispatchId}`,
    ),
  );
}
