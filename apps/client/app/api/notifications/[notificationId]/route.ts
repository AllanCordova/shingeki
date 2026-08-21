import { forwardToApi } from "@/lib/api/server";
import { respond } from "@/lib/api/route-helpers";

type Params = { params: Promise<{ notificationId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { notificationId } = await params;
  return respond(
    await forwardToApi("delete", `/notifications/${notificationId}`),
  );
}
