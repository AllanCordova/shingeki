import { forwardCsvTemplate } from "@/lib/api/route-helpers";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.toString();
  const path = `/admin/browser-captures/export${query ? `?${query}` : ""}`;
  return forwardCsvTemplate(path, "shingeki-browser-captures.csv");
}
