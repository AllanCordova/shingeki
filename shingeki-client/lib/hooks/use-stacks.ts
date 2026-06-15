"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import { queryKeys } from "@/lib/query-keys";
import type { StacksResponse } from "@/lib/contracts";

export function useStacks() {
  const query = useQuery({
    queryKey: queryKeys.stacks,
    queryFn: async () => {
      const { data } = await apiClient.get<StacksResponse>("/stacks");
      return data.stacks;
    },
  });

  return {
    stacks: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}
