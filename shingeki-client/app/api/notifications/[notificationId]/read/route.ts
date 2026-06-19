import { forwardToApi } from "@/lib/api/server";
import { respond } from "@/lib/api/route-helpers";

type Params = { params: Promise<{ notificationId: string }> };

export async function PATCH(_request: Request, { params }: Params) {
  const { notificationId } = await params;
  return respond(
    await forwardToApi("patch", `/notifications/${notificationId}/read`),
  );
}
