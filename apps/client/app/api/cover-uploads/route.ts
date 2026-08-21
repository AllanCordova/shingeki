import { forwardToApi } from "@/lib/api/server";
import { respond } from "@/lib/api/route-helpers";

export async function GET() {
  return respond(await forwardToApi("get", "/cover-uploads"));
}
