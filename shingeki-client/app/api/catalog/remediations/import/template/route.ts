import { createServerApi } from "@/lib/api/server";
import { NextResponse } from "next/server";

export async function GET() {
  const api = await createServerApi();
  const response = await api.get("/catalog/remediations/import/template", {
    responseType: "arraybuffer",
  });

  if (response.status >= 400) {
    return NextResponse.json(response.data, { status: response.status });
  }

  return new NextResponse(response.data, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=UTF-8",
      "Content-Disposition":
        response.headers["content-disposition"] ??
        'attachment; filename="catalog-remediations-template.csv"',
    },
  });
}
