export type RemediationHistoryEventType =
  | "ai_suggestion"
  | "github_pr"
  | "scan_completed"
  | "scan_clean";

export interface RemediationHistoryEvent {
  type: RemediationHistoryEventType;
  occurred_at: string;
  dispatch_id: string | null;
  label: string;
  provider?: string;
  model?: string;
  github_pr_number?: number;
  github_pr_url?: string;
  findings_count?: number;
  scan_type?: string;
}

export interface RemediationHistoryResponse {
  events: RemediationHistoryEvent[];
}
