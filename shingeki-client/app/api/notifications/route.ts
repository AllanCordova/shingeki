import { forwardGetWithQuery, respond } from "@/lib/api/route-helpers";
import { forwardToApi } from "@/lib/api/server";

export async function GET(request: Request) {
  return forwardGetWithQuery(request, "/notifications");
}

export async function DELETE() {
  return respond(await forwardToApi("delete", "/notifications"));
}
