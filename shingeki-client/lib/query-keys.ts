/**
 * Chaves centralizadas do React Query.
 * Mantem o cache previsivel e facilita invalidacoes.
 */
import type { CatalogListQueryParams, ResultsQueryParams } from "@/lib/contracts";
import { DEFAULT_PAGE_SIZE, NOTIFICATION_BELL_PAGE_SIZE } from "@/lib/contracts/common/common";

export const queryKeys = {
  me: ["me"] as const,

  adminUsersAll: ["admin", "users"] as const,
  adminUsers: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    role?: string;
  }) =>
    [
      ...queryKeys.adminUsersAll,
      params?.page ?? 1,
      params?.per_page ?? DEFAULT_PAGE_SIZE,
      params?.search ?? "",
      params?.role ?? "",
    ] as const,

  coverUploads: ["cover-uploads"] as const,
  coverStockImages: (query: string) => ["cover-stock-images", query] as const,
  stacks: ["stacks"] as const,

  ownedSystemsAll: ["systems", "owned"] as const,
  ownedSystem: (systemId: string) => ["systems", "owned", systemId] as const,

  catalogAttacksAll: ["catalog", "attacks"] as const,
  catalogAttacks: (params?: CatalogListQueryParams) =>
    [
      ...queryKeys.catalogAttacksAll,
      params?.page ?? 1,
      params?.per_page ?? DEFAULT_PAGE_SIZE,
      params?.user_id ?? "all",
    ] as const,
  catalogRemediationsAll: ["catalog", "remediations"] as const,
  catalogRemediations: (params?: CatalogListQueryParams) =>
    [
      ...queryKeys.catalogRemediationsAll,
      params?.page ?? 1,
      params?.per_page ?? DEFAULT_PAGE_SIZE,
      params?.user_id ?? "all",
    ] as const,
  catalogImport: (importId: string) => ["catalog", "imports", importId] as const,

  notificationsAll: ["notifications"] as const,
  notifications: (page?: number, perPage?: number) =>
    [
      ...queryKeys.notificationsAll,
      page ?? 1,
      perPage ?? NOTIFICATION_BELL_PAGE_SIZE,
    ] as const,
  notificationUnreadCount: ["notifications", "unread-count"] as const,

  projects: (userId: string) => ["projects", userId] as const,
  project: (projectId: string) => ["projects", projectId] as const,
  projectDashboard: (projectId: string) => ["projects", projectId, "dashboard"] as const,

  systems: (projectId: string) => ["projects", projectId, "systems"] as const,
  system: (projectId: string, systemId: string) =>
    ["projects", projectId, "systems", systemId] as const,
  targetSession: (projectId: string, systemId: string) =>
    ["projects", projectId, "systems", systemId, "target-session"] as const,
  manualProxyRoutes: (projectId: string, systemId: string) =>
    ["projects", projectId, "systems", systemId, "manual-proxy", "routes"] as const,

  dispatches: (projectId: string, systemId: string) =>
    ["projects", projectId, "systems", systemId, "dispatches"] as const,
  attackAcknowledgment: (projectId: string, systemId: string) =>
    ["projects", projectId, "systems", systemId, "attack-acknowledgment"] as const,
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
      params?.per_page ?? DEFAULT_PAGE_SIZE,
      params?.results_page ?? 1,
      params?.results_per_page ?? DEFAULT_PAGE_SIZE,
      params?.filter ?? "all",
      params?.category ?? "",
      params?.risk_level ?? "",
      params?.route ?? "",
      params?.q ?? "",
    ] as const,

  dispatchCompare: (
    projectId: string,
    systemId: string,
    baselineId: string | null,
    targetId: string | null,
  ) =>
    [
      "projects",
      projectId,
      "systems",
      systemId,
      "compare",
      baselineId ?? "",
      targetId ?? "",
    ] as const,

  remediationHistory: (
    projectId: string,
    systemId: string,
    filters: {
      page?: number;
      per_page?: number;
      from?: string;
      to?: string;
      type?: string;
    } = {},
  ) =>
    [
      "projects",
      projectId,
      "systems",
      systemId,
      "remediation-history",
      filters.page ?? 1,
      filters.per_page ?? 25,
      filters.from ?? "",
      filters.to ?? "",
      filters.type ?? "",
    ] as const,
};

