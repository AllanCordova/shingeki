import type { SystemResult } from "@/lib/contracts";

type FindingSourceLocationInput = Pick<
  SystemResult,
  | "source_location"
  | "source_file"
  | "start_line"
  | "end_line"
  | "vulnerable_route"
>;

export function formatFindingSourceLocation(
  result: FindingSourceLocationInput,
): string | null {  if (result.source_location?.label) {
    return result.source_location.label;
  }

  const file = result.source_file?.trim();
  const startLine = result.start_line ?? null;
  const endLine = result.end_line ?? null;

  if (file && startLine !== null) {
    if (endLine !== null && endLine !== startLine) {
      return `${file}:${startLine}-${endLine}`;
    }

    return `${file}:${startLine}`;
  }

  const route = result.vulnerable_route?.trim();

  if (!route || route.startsWith("http://") || route.startsWith("https://")) {
    return null;
  }

  return route.replace(/^\/tmp\/shingeki-sast-[^/]+\/repo\//, "");
}

export function isSastResult(
  result: SystemResult,
  dispatchScanType?: string | null,
): boolean {
  return (result.attack?.scan_type ?? dispatchScanType) === "SAST";
}
