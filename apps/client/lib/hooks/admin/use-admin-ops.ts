"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type { AdminOpsStatusResponse } from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";

export function useAdminOpsStatus(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.adminOpsStatus,
    queryFn: async () => {
      const { data } = await apiClient.get<AdminOpsStatusResponse>(
        "/admin/ops/status",
      );
      return data;
    },
    enabled,
    refetchInterval: 20_000,
  });

  return {
    status: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}
