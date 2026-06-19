"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import { queryKeys } from "@/lib/query-keys";
import type { AttackDispatchResponse } from "@/lib/contracts";

export type AttackScanType = "dast" | "sast";

function dispatchPath(
  projectId: string,
  systemId: string,
  scanType: AttackScanType,
): string {
  const base = `/projects/${projectId}/systems/${systemId}/attacks/dispatch`;
  return scanType === "sast" ? `${base}/sast` : base;
}

/** Dispara o catalogo DAST ou SAST contra um sistema (assinatura resolvida no servidor). */
export function useDispatchAttack(projectId: string, systemId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (scanType: AttackScanType) => {
      const { data } = await apiClient.post<AttackDispatchResponse>(
        dispatchPath(projectId, systemId, scanType),
        {},
      );
      return { ...data, scanType };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dispatches(projectId, systemId),
      });
    },
  });

  const pendingScanType =
    mutation.isPending && mutation.variables ? mutation.variables : null;

  return {
    dispatchAttack: (scanType: AttackScanType) => mutation.mutateAsync(scanType),
    data: mutation.data,
    isLoading: mutation.isPending,
    pendingScanType,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}
