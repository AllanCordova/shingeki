"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import { queryKeys } from "@/lib/query-keys";

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
