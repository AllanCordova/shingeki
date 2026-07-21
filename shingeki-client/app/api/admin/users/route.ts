import { forwardGetWithQuery } from "@/lib/api/route-helpers";

export async function GET(request: Request) {
  return forwardGetWithQuery(request, "/admin/users");
}
