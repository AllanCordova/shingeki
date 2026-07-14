import type { Timestamps } from "./common";

export type AttackDepth = "quick" | "full";

export type AttackDiscoveryScope = {
  start_path?: string;
  max_routes?: number;
};

export type AttackDispatchInput = {
  depth?: AttackDepth;
} & AttackDiscoveryScope;

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

export type DispatchStatus = "pending" | "completed";

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
