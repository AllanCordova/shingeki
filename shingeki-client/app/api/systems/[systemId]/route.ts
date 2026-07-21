import { forwardGetWithQuery } from "@/lib/api/route-helpers";

type Params = { params: Promise<{ systemId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { systemId } = await params;
  return forwardGetWithQuery(request, `/systems/${systemId}`);
}
