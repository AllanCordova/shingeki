import type { AttackScanTypeValue } from "./attack";
import type { PaginationMeta } from "./common";
import type { Stack } from "./stack";

export interface RemediationSnippet {
  stack: Pick<Stack, "id" | "slug" | "name">;
  title: string;
  description: string;
  code_snippet: string;
  references: string[];
}

export interface RemediatedFinding {
  system_result_id: string;
  attack_dispatch_id: string | null;
  scan_type?: AttackScanTypeValue;
  vulnerable_route: string | null;
  payload_used: string | null;
  evidence: string | null;
  http_request: string | null;
  attack?: {
    id: string;
    category: string;
    target_location: string;
    risk_level: string;
  };
  remediations: RemediationSnippet[];
}

export interface RemediateSystemInput {
  dispatch_id?: string;
  page?: number;
  per_page?: number;
}

export interface RemediateSystemResponse {
  message: string;
  system_id: string;
  dispatch_id: string;
  stacks: Pick<Stack, "id" | "slug" | "name">[];
  findings_count: number;
  findings: RemediatedFinding[];
  findings_pagination: PaginationMeta;
}

export type AiConfidence = "high" | "medium" | "low";

export interface AiSourceContext {
  excerpt: string;
  file: string | null;
  line: number | null;
  origin: "repository" | "evidence" | "dast_heuristic";
}

export interface AiSuggestion {
  system_result_id: string;
  location: {
    file: string | null;
    line: number | null;
  };
  root_cause: string;
  risk_summary: string;
  suggested_fix: {
    description: string;
    code: string;
  };
  validation: {
    why_this_fixes: string;
    confidence: AiConfidence;
    syntax_valid: boolean;
  };
  references: string[];
}

export interface AiRemediatedFinding {
  system_result_id: string;
  attack_dispatch_id: string | null;
  scan_type?: AttackScanTypeValue;
  vulnerable_route: string | null;
  payload_used: string | null;
  evidence: string | null;
  http_request: string | null;
  attack?: RemediatedFinding["attack"];
  source_context: AiSourceContext;
  ai_suggestion: AiSuggestion;
  cached: boolean;
}

export interface RemediateSystemAiInput {
  dispatch_id?: string;
  finding_ids?: string[];
  regenerate?: boolean;
  page?: number;
  per_page?: number;
}

export interface RemediateSystemAiResponse {
  message: string;
  system_id: string;
  dispatch_id: string;
  provider: string;
  model: string;
  stacks: Pick<Stack, "id" | "slug" | "name">[];
  findings_count: number;
  findings: AiRemediatedFinding[];
  findings_pagination: PaginationMeta;
}
