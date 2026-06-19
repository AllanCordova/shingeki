import { forwardToApi } from "@/lib/api/server";
import { respond } from "@/lib/api/route-helpers";

export async function POST() {
  return respond(await forwardToApi("post", "/notifications/read-all"));
}
