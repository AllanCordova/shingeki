import { forwardCsvTemplate } from "@/lib/api/route-helpers";

export async function GET() {
  return forwardCsvTemplate(
    "/catalog/remediations/import/template",
    "catalog-remediations-template.csv",
  );
}
