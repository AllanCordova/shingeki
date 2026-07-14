export type RemediationHistoryEventType =
  | "ai_suggestion"
  | "catalog_suggestion"
  | "github_pr"
  | "scan_completed"
  | "scan_clean";

/** API/query filter groups for the history page. */
export type RemediationHistoryTypeFilter =
  | "catalog_suggestion"
  | "ai_suggestion"
  | "attack"
  | "github_pr"
  | "";

export interface RemediationHistoryEvent {
  id?: string;
  type: RemediationHistoryEventType;
  occurred_at: string;
  dispatch_id: string | null;
  label: string;
  provider?: string | null;
  model?: string | null;
  github_pr_number?: number;
  github_pr_url?: string;
  findings_count?: number;
  scan_type?: string;
}

export interface RemediationHistoryFilters {
  page?: number;
  per_page?: number;
  from?: string;
  to?: string;
  type?: RemediationHistoryTypeFilter;
}

export interface RemediationHistoryResponse {
  events: RemediationHistoryEvent[];
  pagination: import("./common").PaginationMeta;
}

export const REMEDIATION_HISTORY_PREVIEW_SIZE = 5;
export const REMEDIATION_HISTORY_PAGE_SIZE = 30;
