"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type { RemediationHistoryEvent } from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";

export function useRemediationHistory(projectId: string, systemId: string) {
  const query = useQuery({
    queryKey: queryKeys.remediationHistory(projectId, systemId),
    queryFn: async () => {
      const { data } = await apiClient.get<{ events: RemediationHistoryEvent[] }>(
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
