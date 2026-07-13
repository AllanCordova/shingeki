export interface DispatchCompareFinding {
  id: string;
  vulnerable_route: string | null;
  payload_used: string | null;
  evidence: string | null;
  source_file?: string | null;
  start_line?: number | null;
  attack?: {
    category: string;
    risk_level: string;
  };
}

export interface DispatchCompareSummary {
  new: number;
  resolved: number;
  persisted: number;
}

export interface DispatchCompareResponse {
  baseline: {
    id: string;
    dispatched_at: string | null;
    findings_count: number | null;
    scan_type: string;
  };
  target: {
    id: string;
    dispatched_at: string | null;
    findings_count: number | null;
    scan_type: string;
  };
  summary: DispatchCompareSummary;
  new_findings: DispatchCompareFinding[];
  resolved_findings: DispatchCompareFinding[];
  persisted_findings: DispatchCompareFinding[];
}
