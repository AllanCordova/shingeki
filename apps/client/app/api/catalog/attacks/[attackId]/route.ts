import { forwardToApi } from "@/lib/api/server";
import { readJson, respond } from "@/lib/api/route-helpers";

export async function GET(
  _request: Request,
  context: { params: Promise<{ attackId: string }> },
) {
  const { attackId } = await context.params;
  return respond(await forwardToApi("get", `/catalog/attacks/${attackId}`));
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ attackId: string }> },
) {
  const { attackId } = await context.params;
  const body = await readJson(request);
  return respond(
    await forwardToApi("put", `/catalog/attacks/${attackId}`, { body }),
  );
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ attackId: string }> },
) {
  const { attackId } = await context.params;
  return respond(await forwardToApi("delete", `/catalog/attacks/${attackId}`));
}
