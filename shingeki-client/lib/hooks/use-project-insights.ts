"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type { ProjectDashboardResponse } from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";

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

export function useRemediationHistory(projectId: string, systemId: string) {
  const query = useQuery({
    queryKey: queryKeys.remediationHistory(projectId, systemId),
    queryFn: async () => {
      const { data } = await apiClient.get<{ events: import("@/lib/contracts").RemediationHistoryEvent[] }>(
        `/projects/${projectId}/systems/${systemId}/remediation-history`,
      );
      return data.events;
    },
    enabled: Boolean(projectId && systemId),
  });

  return {
    events: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}
