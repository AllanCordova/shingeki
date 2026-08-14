import { z } from "zod";
import type { Attack } from "./attack";
import type { Timestamps } from "./common";
import type { CatalogAuthor, CatalogListResponseMeta } from "./catalog-list";
import { zJsonObjectString } from "./zod-helpers";

export const catalogAttackCreateSchema = z.object({
  scan_type: z.enum(["DAST", "SAST"]),
  category: z.string().min(1, "Informe a categoria."),
  target_location: z.string().min(1, "Informe o alvo do payload."),
  risk_level: z.enum(["LOW", "MEDIUM", "HIGH"]),
  payload_json: zJsonObjectString("Payload deve ser um objeto JSON valido.").refine(
    (value) => value.length > 0,
    "Informe o payload JSON.",
  ),
});

export type CatalogAttackCreateInput = z.infer<typeof catalogAttackCreateSchema>;

/** @deprecated Use CatalogAuthor */
export type CatalogAttackAuthor = CatalogAuthor;

export interface CatalogAttack extends Attack {
  author: CatalogAuthor | null;
  permissions: {
    update: boolean;
    delete: boolean;
  };
}

export interface CatalogAttacksResponse extends CatalogListResponseMeta {
  attacks: CatalogAttack[];
}

export interface CatalogAttackResponse {
  message?: string;
  attack: CatalogAttack;
}

export function parseCatalogAttackPayload(input: CatalogAttackCreateInput) {
  return {
    scan_type: input.scan_type,
    category: input.category,
    target_location: input.target_location,
    risk_level: input.risk_level,
    payload: JSON.parse(input.payload_json) as Record<string, unknown>,
  };
}

export function formatCatalogAttackPayload(
  attack: Pick<CatalogAttack, "payload">,
): string {
  return JSON.stringify(attack.payload ?? {}, null, 2);
}

export const ATTACK_CATEGORIES = [
  "SQL_INJECTION",
  "XSS",
  "CSRF",
  "COMMAND_INJECTION",
  "PATH_TRAVERSAL",
  "SSRF",
  "XXE",
  "LDAP_INJECTION",
  "NOSQL_INJECTION",
  "IDOR",
] as const;

export const ATTACK_TARGET_LOCATIONS = [
  "FORM",
  "QUERY_PARAMETER",
  "HEADER",
  "COOKIE",
  "JSON_BODY",
  "URL_PATH",
  "FILE_UPLOAD",
  "API_ENDPOINT",
  "SOURCE_CODE",
] as const;

export type CatalogAttackTimestamps = Timestamps;
