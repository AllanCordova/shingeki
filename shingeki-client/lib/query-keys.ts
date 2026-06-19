/**
 * Chaves centralizadas do React Query.
 * Mantem o cache previsivel e facilita invalidacoes.
 */
import type { ResultsQueryParams } from "@/lib/contracts";

export const queryKeys = {
  me: ["me"] as const,

  coverUploads: ["cover-uploads"] as const,
  coverStockImages: (query: string) => ["cover-stock-images", query] as const,
  stacks: ["stacks"] as const,

  catalogAttacks: ["catalog", "attacks"] as const,
  catalogRemediations: ["catalog", "remediations"] as const,
  catalogImport: (importId: string) => ["catalog", "imports", importId] as const,

  projects: ["projects"] as const,
  project: (projectId: string) => ["projects", projectId] as const,

  systems: (projectId: string) => ["projects", projectId, "systems"] as const,
  system: (projectId: string, systemId: string) =>
    ["projects", projectId, "systems", systemId] as const,
  targetSession: (projectId: string, systemId: string) =>
    ["projects", projectId, "systems", systemId, "target-session"] as const,

  dispatches: (projectId: string, systemId: string) =>
    ["projects", projectId, "systems", systemId, "dispatches"] as const,
  results: (
    projectId: string,
    systemId: string,
    dispatchId: string,
    params?: ResultsQueryParams,
  ) =>
    [
      "projects",
      projectId,
      "systems",
      systemId,
      "dispatches",
      dispatchId,
      params?.page ?? 1,
      params?.per_page ?? 25,
      params?.filter ?? "all",
    ] as const,
};
