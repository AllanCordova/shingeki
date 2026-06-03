/**
 * Chaves centralizadas do React Query.
 * Mantem o cache previsivel e facilita invalidacoes.
 */
export const queryKeys = {
  me: ["me"] as const,

  coverUploads: ["cover-uploads"] as const,
  coverStockImages: (query: string) => ["cover-stock-images", query] as const,

  projects: ["projects"] as const,
  project: (projectId: string) => ["projects", projectId] as const,

  systems: (projectId: string) => ["projects", projectId, "systems"] as const,
  system: (projectId: string, systemId: string) =>
    ["projects", projectId, "systems", systemId] as const,

  dispatches: (projectId: string, systemId: string) =>
    ["projects", projectId, "systems", systemId, "dispatches"] as const,
  results: (projectId: string, systemId: string, dispatchId: string) =>
    [
      "projects",
      projectId,
      "systems",
      systemId,
      "dispatches",
      dispatchId,
    ] as const,
};
