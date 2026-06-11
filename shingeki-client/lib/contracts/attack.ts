import { z } from "zod";
import type { Timestamps } from "./common";

export const attackDispatchSchema = z.object({
  signature_token: z
    .string()
    .min(1, "Informe o token de assinatura.")
    .length(64, "O token de assinatura deve ter exatamente 64 caracteres."),
});

export type AttackDispatchInput = z.infer<typeof attackDispatchSchema>;

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
