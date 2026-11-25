import { forwardToApi } from "@/lib/api/server";
import { respond } from "@/lib/api/route-helpers";

type Params = { params: Promise<{ capture: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { capture } = await params;
  return respond(await forwardToApi("get", `/admin/browser-captures/${capture}`));
}
