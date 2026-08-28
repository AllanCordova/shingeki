import { forwardToApi } from "@/lib/api/server";
import { readJson, respond } from "@/lib/api/route-helpers";

export async function PUT(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;
  const body = await readJson(request);
  return respond(await forwardToApi("put", `/admin/users/${userId}`, { body }));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;
  return respond(await forwardToApi("delete", `/admin/users/${userId}`));
}
