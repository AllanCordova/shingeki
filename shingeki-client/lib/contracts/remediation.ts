import type { AttackScanTypeValue } from "./attack";
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
}

export interface RemediateSystemResponse {
  message: string;
  system_id: string;
  dispatch_id: string;
  stacks: Pick<Stack, "id" | "slug" | "name">[];
  findings_count: number;
  findings: RemediatedFinding[];
}
