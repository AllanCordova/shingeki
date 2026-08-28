import { forwardToApi } from "@/lib/api/server";
import { readJson, respond } from "@/lib/api/route-helpers";

type Params = { params: Promise<{ projectId: string; systemId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { projectId, systemId } = await params;
  const body = await readJson(request);

  return respond(
    await forwardToApi(
      "post",
      `/projects/${projectId}/systems/${systemId}/remediate/github-pr`,
      { body },
    ),
  );
}
