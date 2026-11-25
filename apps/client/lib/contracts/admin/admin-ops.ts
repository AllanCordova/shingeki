export interface AdminOpsQueueStatus {
  name: string;
  status: "ok" | "degraded" | "down" | "unknown";
  messages: number | null;
  consumers: number | null;
  message: string | null;
}

export interface AdminOpsCaptureStatus {
  configured: boolean;
  status: "ok" | "down";
  busy: boolean;
  active_capture_id: string | null;
  message: string | null;
}

export interface AdminOpsUsageWindow {
  dispatches_total: number;
  dispatches_by_scan_type: Record<string, number>;
  dispatches_completed: number;
  dispatches_failed: number;
  dispatches_cancelled: number;
  dispatches_pending: number;
  captures_created: number;
  captures_completed: number;
  captures_imported: number;
  captures_browser_opened: number;
  unique_users_opened_browser: number;
}

export interface AdminOpsInFlightItem {
  id: string;
  scan_type: string;
  status: string;
  system_id: string;
  system_name: string | null;
  user_email: string | null;
  dispatched_at: string | null;
  vectors_discovered: number | null;
  jobs_planned: number | null;
  probes_count: number | null;
  updated_at: string | null;
}

export interface AdminOpsStatusResponse {
  captured_at: string;
  capture: AdminOpsCaptureStatus;
  queues: AdminOpsQueueStatus[];
  usage: {
    last_24h: AdminOpsUsageWindow;
    last_7d: AdminOpsUsageWindow;
  };
  in_flight: {
    count: number;
    latest_progress_at: string | null;
    items: AdminOpsInFlightItem[];
  };
}
