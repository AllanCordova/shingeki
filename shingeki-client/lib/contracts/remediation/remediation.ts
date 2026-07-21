import type { AttackScanTypeValue } from "../attack/attack";
import type { PaginationMeta } from "../common/common";
import type { Stack } from "../system/stack";
import type { SystemResult } from "../results/result";
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
  source_file?: string | null;
  start_line?: number | null;
  end_line?: number | null;
  source_location?: SystemResult["source_location"];
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
  source_file?: string | null;
  start_line?: number | null;
  end_line?: number | null;
  source_location?: SystemResult["source_location"];
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

export interface OpenGitHubRemediationPrInput {
  dispatch_id?: string;
  finding_ids: string[];
  regenerate?: boolean;
  title?: string;
  base_branch?: string;
}

export interface GitHubRemediationPrPreviewFileChange {
  start_line: number;
  end_line: number;
  replacement: string;
}

export interface GitHubRemediationPrPreviewFile {
  path: string;
  github_path: string | null;
  status: "ready" | "skipped";
  reason: string | null;
  findings_count: number;
  before: string | null;
  after: string | null;
  changes: GitHubRemediationPrPreviewFileChange[];
}

export interface GitHubRemediationPrPreviewResponse {
  message: string;
  system_id: string;
  dispatch_id: string;
  repository: {
    owner: string;
    repo: string;
    url: string;
  };
  pull_request: {
    title: string;
    body: string;
    head_branch: string;
    base_branch: string;
  };
  files: GitHubRemediationPrPreviewFile[];
  files_ready: number;
  findings_applied: number;
  skipped_files?: Array<{
    scan_path: string;
    reason: string;
  }>;
  warnings?: string[];
  can_submit: boolean;
  provider: string;
  model: string;
}

export interface OpenGitHubRemediationPrResponse {
  message: string;
  system_id: string;
  dispatch_id: string;
  pull_request: {
    id: string;
    number: number;
    url: string;
    head_branch: string;
    base_branch: string;
    compare_only?: boolean;
  };
  files_changed: number;
  findings_applied: number;
  skipped_files?: Array<{
    scan_path: string;
    reason: string;
  }>;
  warnings?: string[];
  provider: string;
  model: string;
}
