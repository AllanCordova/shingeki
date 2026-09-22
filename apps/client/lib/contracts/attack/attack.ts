import type { Timestamps } from "../common/common";

export type AttackDepth = "quick" | "full";

export type AttackDiscoveryScope = {
  start_path?: string;
  max_routes?: number;
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

export type DispatchStatus = "pending" | "completed" | "failed";

export function dispatchStatusLabel(status: DispatchStatus): string {
  if (status === "completed") return "Concluído";
  if (status === "failed") return "Falhou";
  return "Processando";
}

export function dispatchFailureCopy(reason?: string | null): string {
  const text = (reason ?? "").toLowerCase();
  if (text.includes("scanner login")) {
    return "O scanner não conseguiu entrar no alvo. Verifique usuário, senha e a URL de login, depois dispare novamente.";
  }
  return "O scan não foi concluído. Tente disparar novamente.";
}

export function dispatchStatusTone(
  status: DispatchStatus,
): "success" | "danger" | "warning" {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
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
  attacks_count: number;
  dispatched_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  findings_count: number | null;
  probes_count: number | null;
  vectors_discovered: number | null;
  jobs_planned: number | null;
  failed_at?: string | null;
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
