import { z } from "zod";
import type { AttackScanTypeValue } from "./attack";
import type { Stack } from "./stack";
import type { Timestamps } from "./common";
import type { CatalogAuthor, CatalogListResponseMeta } from "./catalog-list";

export const catalogRemediationCreateSchema = z.object({
  stack_id: z.string().uuid("Selecione uma stack."),
  scan_type: z.enum(["DAST", "SAST"]).optional().or(z.literal("")),
  attack_category: z.string().optional().or(z.literal("")),
  semgrep_rule_id: z.string().optional().or(z.literal("")),
  title: z.string().min(1, "Informe o titulo.").max(255),
  description: z.string().min(1, "Informe a descricao."),
  code_snippet: z.string().min(1, "Informe o script de mitigacao."),
  references_text: z.string().optional().or(z.literal("")),
});

export type CatalogRemediationCreateInput = z.infer<
  typeof catalogRemediationCreateSchema
>;

/** @deprecated Use CatalogAuthor */
export type CatalogRemediationAuthor = CatalogAuthor;

export interface CatalogRemediation extends Timestamps {
  id: string;
  user_id: string;
  stack_id: string;
  stack: Pick<Stack, "id" | "slug" | "name"> | null;
  scan_type?: AttackScanTypeValue | null;
  attack_category?: string | null;
  semgrep_rule_id?: string | null;
  title: string;
  description: string;
  code_snippet: string;
  references: string[];
  author: CatalogAuthor | null;
  permissions: {
    update: boolean;
    delete: boolean;
  };
}

export interface CatalogRemediationsResponse extends CatalogListResponseMeta {
  remediations: CatalogRemediation[];
}

export interface CatalogRemediationResponse {
  message?: string;
  remediation: CatalogRemediation;
}

export function parseCatalogRemediationPayload(
  input: CatalogRemediationCreateInput,
) {
  const references = (input.references_text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    stack_id: input.stack_id,
    scan_type: input.scan_type || null,
    attack_category: input.attack_category || null,
    semgrep_rule_id: input.semgrep_rule_id || null,
    title: input.title,
    description: input.description,
    code_snippet: input.code_snippet,
    references,
  };
}

export function formatCatalogRemediationReferences(
  remediation: Pick<CatalogRemediation, "references">,
): string {
  return (remediation.references ?? []).join("\n");
}
