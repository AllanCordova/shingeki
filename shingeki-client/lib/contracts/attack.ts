import type { Timestamps } from "./common";

export type AttackDispatchInput = Record<string, never>;

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
  attacks_count: number;
  dispatched_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  findings_count: number | null;
  status: DispatchStatus;
}

export interface AttackDispatchResponse {
  message: string;
  dispatch: AttackDispatch;
  attacks_count: number;
  attacks: Attack[];
}
