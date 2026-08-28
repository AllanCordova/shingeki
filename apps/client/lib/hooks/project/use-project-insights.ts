"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type { ProjectDashboardResponse } from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";
import type { RemediationHistoryEvent } from "@/lib/contracts";

const EMPTY_HISTORY_EVENTS: RemediationHistoryEvent[] = [];

export function useProjectDashboard(projectId: string) {
  const query = useQuery({
    queryKey: queryKeys.projectDashboard(projectId),
    queryFn: async () => {
      const { data } = await apiClient.get<ProjectDashboardResponse>(
        `/projects/${projectId}/dashboard`,
      );
      return data.dashboard;
    },
    enabled: Boolean(projectId),
  });

  return {
    dashboard: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useCompareDispatches(
  projectId: string,
  systemId: string,
  baselineId: string | null,
  targetId: string | null,
) {
  const query = useQuery({
    queryKey: queryKeys.dispatchCompare(projectId, systemId, baselineId, targetId),
    queryFn: async () => {
      const search = new URLSearchParams({
        baseline_id: baselineId!,
        target_id: targetId!,
      });
      const { data } = await apiClient.get(
        `/projects/${projectId}/systems/${systemId}/system-results/compare?${search.toString()}`,
      );
      return data;
    },
    enabled: Boolean(projectId && systemId && baselineId && targetId),
  });

  return {
    comparison: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useRemediationHistory(
  projectId: string,
  systemId: string,
  filters: {
    page?: number;
    per_page?: number;
    from?: string;
    to?: string;
    type?: string;
  } = {},
) {
  const page = filters.page ?? 1;
  const perPage = filters.per_page ?? 25;
  const from = filters.from ?? "";
  const to = filters.to ?? "";
  const type = filters.type ?? "";

  const query = useQuery({
    queryKey: queryKeys.remediationHistory(projectId, systemId, {
      page,
      per_page: perPage,
      from,
      to,
      type,
    }),
    queryFn: async () => {
      const search = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });
      if (from) search.set("from", from);
      if (to) search.set("to", to);
      if (type) search.set("type", type);

      const { data } = await apiClient.get<
        import("@/lib/contracts").RemediationHistoryResponse
      >(
        `/projects/${projectId}/systems/${systemId}/remediation-history?${search.toString()}`,
      );
      return data;
    },
    enabled: Boolean(projectId && systemId),
  });

  return {
    events: query.data?.events ?? EMPTY_HISTORY_EVENTS,
    pagination: query.data?.pagination ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}
