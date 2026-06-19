import { forwardFormToApi } from "@/lib/api/server";
import { respond } from "@/lib/api/route-helpers";

export async function POST(request: Request) {
  const formData = await request.formData();

  return respond(
    await forwardFormToApi("post", "/catalog/remediations/import", formData),
  );
}
