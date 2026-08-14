"use client";

import { useQuery } from "@tanstack/react-query";
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
