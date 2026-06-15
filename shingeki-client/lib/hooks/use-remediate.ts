"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type {
  RemediateSystemInput,
  RemediateSystemResponse,
} from "@/lib/contracts";

export function useRemediateSystem(projectId: string, systemId: string) {
  const mutation = useMutation({
    mutationFn: async (input: RemediateSystemInput = {}) => {
      const { data } = await apiClient.post<RemediateSystemResponse>(
        `/projects/${projectId}/systems/${systemId}/remediate`,
        input,
      );
      return data;
    },
  });

  return {
    remediate: mutation.mutateAsync,
    data: mutation.data,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}
