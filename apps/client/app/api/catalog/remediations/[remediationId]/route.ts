import { forwardToApi } from "@/lib/api/server";
import { readJson, respond } from "@/lib/api/route-helpers";

export async function GET(
  _request: Request,
  context: { params: Promise<{ remediationId: string }> },
) {
  const { remediationId } = await context.params;
  return respond(
    await forwardToApi("get", `/catalog/remediations/${remediationId}`),
  );
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ remediationId: string }> },
) {
  const { remediationId } = await context.params;
  const body = await readJson(request);
  return respond(
    await forwardToApi("put", `/catalog/remediations/${remediationId}`, {
      body,
    }),
  );
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ remediationId: string }> },
) {
  const { remediationId } = await context.params;
  return respond(
    await forwardToApi("delete", `/catalog/remediations/${remediationId}`),
  );
}
