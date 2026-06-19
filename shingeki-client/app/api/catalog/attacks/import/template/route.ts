import { forwardCsvTemplate } from "@/lib/api/route-helpers";

export async function GET() {
  return forwardCsvTemplate(
    "/catalog/attacks/import/template",
    "catalog-attacks-template.csv",
  );
}
