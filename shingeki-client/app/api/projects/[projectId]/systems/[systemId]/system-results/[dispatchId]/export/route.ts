import { forwardPdfDownload } from "@/lib/api/route-helpers";

type Params = {
  params: Promise<{ projectId: string; systemId: string; dispatchId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { projectId, systemId, dispatchId } = await params;

  return forwardPdfDownload(
    `/projects/${projectId}/systems/${systemId}/system-results/${dispatchId}/export`,
    `shingeki-relatorio-auditoria-${dispatchId.slice(0, 8)}.pdf`,
  );
}
