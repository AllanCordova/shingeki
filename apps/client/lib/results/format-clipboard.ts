import type { SystemResult } from "@/lib/contracts";
import { formatFindingSourceLocation, isSastResult } from "@/lib/results/source-location";

function pushField(lines: string[], label: string, value: string | null | undefined) {
  if (!value) return;
  lines.push(`${label}:`);
  lines.push(value);
}

export function formatVulnerabilitiesClipboard(
  results: SystemResult[],
  dispatchScanType?: string | null,
): string {
  const blocks = results.map((result, index) => {
    const sast = isSastResult(result, dispatchScanType);
    const sourceLocation =
      formatFindingSourceLocation(result) ??
      (sast && result.vulnerable_route ? result.vulnerable_route : null);

    const header = [
      `${index + 1}. ${result.attack?.category ?? "Vulnerabilidade"}`,
      result.attack?.risk_level ? `Risco: ${result.attack.risk_level}` : null,
      result.attack?.scan_type ?? dispatchScanType
        ? `Tipo: ${result.attack?.scan_type ?? dispatchScanType}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const lines: string[] = [header];

    pushField(lines, sast ? "Arquivo e linha(s)" : "Localização", sourceLocation);
    if (result.vulnerable_route && !sast) {
      pushField(lines, "Rota vulnerável", result.vulnerable_route);
    }
    pushField(lines, sast ? "Regra SAST" : "Payload", result.payload_used);
    pushField(lines, "Trecho afetado", result.matched_snippet);
    pushField(lines, "Evidência", result.evidence);
    pushField(lines, sast ? "Contexto" : "Requisição HTTP", result.http_request);

    return lines.join("\n");
  });

  return [`Vulnerabilidades (${results.length})`, ...blocks].join("\n\n");
}
