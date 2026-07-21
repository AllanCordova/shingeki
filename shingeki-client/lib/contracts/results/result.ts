import type { Timestamps, PaginationMeta } from "../common/common";
import type { AttackDispatch, AttackScanTypeValue } from "../attack/attack";

export type DispatchProbeOutcome = "clean" | "error" | "vulnerable";

export type DispatchProbeListFilter = "all" | "vulnerable" | "clean";

export type { PaginationMeta } from "../common/common";
export interface ProbeOutcomeCounts {
  all: number;
  vulnerable: number;
  clean: number;
  error: number;
}

export interface DispatchProbe extends Timestamps {
  id: string;
  attack_dispatch_id: string;
  system_id: string;
  attack_id: string;
  route: string;
  payload_used: string;
  http_request: string | null;
  outcome: DispatchProbeOutcome;
  evidence: string;
  error_message: string | null;
  attack?: {
    id: string;
    scan_type?: AttackScanTypeValue;
    category: string;
    target_location: string;
    risk_level: string;
  };
}

export interface SystemResult extends Timestamps {
  id: string;
  system_id: string;
  attack_dispatch_id: string;
  attack_id: string | null;
  vulnerable_route: string | null;
  payload_used: string | null;
  evidence: string | null;
  http_request: string | null;
  source_file?: string | null;
  start_line?: number | null;
  end_line?: number | null;
  matched_snippet?: string | null;
  source_location?: {
    file: string;
    start_line: number;
    end_line: number | null;
    label: string;
  } | null;
  attack?: {
    id: string;
    scan_type?: AttackScanTypeValue;
    category: string;
    target_location: string;
    risk_level: string;
  };
}

export interface DispatchesResponse {
  dispatches: AttackDispatch[];
}

export interface ResultsResponse {
  dispatch: AttackDispatch;
  results: SystemResult[];
  results_pagination: PaginationMeta;
  probes: DispatchProbe[];
  probes_pagination: PaginationMeta;
  probe_counts: ProbeOutcomeCounts;
  filter: DispatchProbeListFilter;
  log_filters?: LogFilters;
}

export interface ResultsQueryParams {
  page?: number;
  per_page?: number;
  results_page?: number;
  results_per_page?: number;
  filter?: DispatchProbeListFilter;
  category?: string;
  risk_level?: string;
  route?: string;
  q?: string;
}

export interface LogFilters {
  category: string | null;
  risk_level: string | null;
  route: string | null;
  q: string | null;
}
