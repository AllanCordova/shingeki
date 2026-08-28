import { forwardToApi } from "@/lib/api/server";
import { respond } from "@/lib/api/route-helpers";

type Params = { params: Promise<{ coverUploadId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { coverUploadId } = await params;
  return respond(
    await forwardToApi("delete", `/cover-uploads/${coverUploadId}`),
  );
}
