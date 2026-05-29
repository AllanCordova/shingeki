"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import { queryKeys } from "@/lib/query-keys";
import type { AttackDispatchInput, AttackDispatchResponse } from "@/lib/contracts";

/** Dispara o catalogo de ataques contra um sistema. */
export function useDispatchAttack(projectId: string, systemId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: AttackDispatchInput) => {
      const { data } = await apiClient.post<AttackDispatchResponse>(
        `/projects/${projectId}/systems/${systemId}/attacks/dispatch`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dispatches(projectId, systemId),
      });
    },
  });

  return {
    dispatchAttack: mutation.mutateAsync,
    data: mutation.data,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}
