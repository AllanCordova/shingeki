import { forwardToApi } from "@/lib/api/server";
import { respond } from "@/lib/api/route-helpers";

export async function GET(
  _request: Request,
  context: { params: Promise<{ importId: string }> },
) {
  const { importId } = await context.params;
  return respond(await forwardToApi("get", `/catalog/imports/${importId}`));
}
