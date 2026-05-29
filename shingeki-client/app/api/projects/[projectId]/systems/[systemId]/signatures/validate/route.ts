import { forwardToApi } from "@/lib/api/server";
import { respond } from "@/lib/api/route-helpers";

type Params = { params: Promise<{ projectId: string; systemId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { projectId, systemId } = await params;
  return respond(
    await forwardToApi(
      "post",
      `/projects/${projectId}/systems/${systemId}/signatures/validate`,
    ),
  );
}
