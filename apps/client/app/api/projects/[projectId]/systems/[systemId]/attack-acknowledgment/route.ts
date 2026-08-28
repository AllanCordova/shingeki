import { forwardGetWithQuery } from "@/lib/api/route-helpers";

type Params = { params: Promise<{ projectId: string; systemId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { projectId, systemId } = await params;
  return forwardGetWithQuery(
    request,
    `/projects/${projectId}/systems/${systemId}/attack-acknowledgment`,
  );
}
