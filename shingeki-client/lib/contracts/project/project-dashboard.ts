export type TrendDirection = "up" | "down" | "flat";

export interface ProjectDashboardDispatchSummary {
  id: string;
  system_id: string;
  system_name: string | null;
  scan_type: string;
  status: "pending" | "completed";
  dispatched_at: string | null;
  findings_count: number | null;
  attacks_count: number;
}

export interface ProjectDashboardSystemFinding {
  system_id: string;
  system_name: string | null;
  findings_count: number;
  dispatch_id: string;
  dispatched_at: string | null;
}

export interface ProjectDashboard {
  systems_count: number;
  total_findings: number;
  previous_total_findings: number;
  findings_trend: number;
  trend_direction: TrendDirection;
  last_dispatch: ProjectDashboardDispatchSummary | null;
  systems_with_findings: ProjectDashboardSystemFinding[];
}

export interface ProjectDashboardResponse {
  dashboard: ProjectDashboard;
}
