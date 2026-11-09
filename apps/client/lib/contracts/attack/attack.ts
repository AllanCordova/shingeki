import type { Timestamps } from "../common/common";
import type { DastRouteMapEntry } from "./route-map";

export type AttackDepth = "quick" | "full";

export type AttackDiscoveryScope = {
  start_path?: string;
  max_routes?: number;
  route_map?: DastRouteMapEntry[];
};

export type AttackDispatchInput = {
  depth?: AttackDepth;
  attack_ids?: string[];
} & AttackDiscoveryScope;

export type DispatchCatalogAttack = {
  id: string;
  scan_type: AttackScanTypeValue;
  category: AttackCategory;
  target_location: string;
  risk_level: AttackRiskLevel;
};

export type DispatchCatalogResponse = {
  attacks: DispatchCatalogAttack[];
};

export type AttackCategory =
  | "SQL_INJECTION"
  | "XSS"
  | "PATH_TRAVERSAL"
  | "SUPPLY_CHAIN"
  | "SECRET_LEAK"
  | string;

export type AttackRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;

export type AttackScanTypeValue = "DAST" | "SAST";

export interface Attack extends Timestamps {
  id: string;
  user_id: string;
  scan_type?: AttackScanTypeValue;
  category: AttackCategory;
  target_location: string;
  risk_level: AttackRiskLevel;
  payload: Record<string, unknown> | null;
}

export type DispatchStatus =
  | "pending"
  | "completed"
  | "failed"
  | "session_expired"
  | "cancelled";

export function dispatchStatusLabel(status: DispatchStatus): string {
  if (status === "completed") return "Concluído";
  if (status === "failed") return "Falhou";
  if (status === "session_expired") return "Sessão expirada";
  if (status === "cancelled") return "Cancelado";
  return "Processando";
}

export function sessionExpiredCopy(): string {
  return "A sessão do alvo expirou no meio do scan. Capture o navegador de novo para continuar em um novo disparo. Os achados deste disparo permanecem aqui.";
}

export function dispatchFailureCopy(reason?: string | null): string {
  const text = (reason ?? "").toLowerCase();
  if (text.includes("scanner login")) {
    return "O scan autenticado não manteve a sessão. Capture o estado do navegador e dispare novamente.";
  }
  return "O scan não foi concluído. Tente disparar novamente.";
}

export function dispatchStatusTone(
  status: DispatchStatus,
): "success" | "danger" | "warning" | "neutral" {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "cancelled") return "neutral";
  if (status === "session_expired") return "warning";
  return "warning";
}

export interface AttackDispatch extends Timestamps {
  id: string;
  system_id: string;
  user_id: string;
  scan_type?: AttackScanTypeValue;
  depth?: AttackDepth;
  start_path?: string | null;
  max_routes?: number | null;
  route_map?: DastRouteMapEntry[] | null;
  route_map_count?: number | null;
  attacks_count: number;
  dispatched_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  findings_count: number | null;
  probes_count: number | null;
  vectors_discovered: number | null;
  jobs_planned: number | null;
  failed_at?: string | null;
  session_expired_at?: string | null;
  cancelled_at?: string | null;
  failure_reason?: string | null;
  status: DispatchStatus;
  probe_counts?: {
    all: number;
    vulnerable: number;
    clean: number;
    error: number;
  };
}

export interface AttackDispatchResponse {
  message: string;
  dispatch: AttackDispatch;
  attacks_count: number;
  attacks: Attack[];
}
