import type { AttackScanTypeValue } from "@/lib/contracts";
import { Badge } from "@/components/ui";

export function ScanTypeBadge({
  scanType,
}: {
  scanType?: AttackScanTypeValue | null;
}) {
  const label = scanType === "SAST" ? "SAST" : "DAST";

  return (
    <Badge tone={scanType === "SAST" ? "warning" : "neutral"}>{label}</Badge>
  );
}
