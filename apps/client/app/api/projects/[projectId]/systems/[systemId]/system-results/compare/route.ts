import { forwardToApi } from "@/lib/api/server";
import { respond } from "@/lib/api/route-helpers";

type Params = {
  params: Promise<{ projectId: string; systemId: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const { projectId, systemId } = await params;
  const query = new URL(request.url).searchParams.toString();
  const path =
    `/projects/${projectId}/systems/${systemId}/system-results/compare` +
    (query ? `?${query}` : "");

  return respond(await forwardToApi("get", path));
}
