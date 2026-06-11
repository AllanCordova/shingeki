"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import { queryKeys } from "@/lib/query-keys";
import type { AttackDispatchInput, AttackDispatchResponse } from "@/lib/contracts";

export type AttackScanType = "dast" | "sast";

function dispatchPath(
  projectId: string,
  systemId: string,
  scanType: AttackScanType,
): string {
  const base = `/projects/${projectId}/systems/${systemId}/attacks/dispatch`;
  return scanType === "sast" ? `${base}/sast` : base;
}

/** Dispara o catalogo DAST ou SAST contra um sistema. */
export function useDispatchAttack(projectId: string, systemId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      input,
      scanType,
    }: {
      input: AttackDispatchInput;
      scanType: AttackScanType;
    }) => {
      const { data } = await apiClient.post<AttackDispatchResponse>(
        dispatchPath(projectId, systemId, scanType),
        input,
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
    mutation.isPending && mutation.variables
      ? mutation.variables.scanType
      : null;

  return {
    dispatchAttack: (input: AttackDispatchInput, scanType: AttackScanType) =>
      mutation.mutateAsync({ input, scanType }),
    data: mutation.data,
    isLoading: mutation.isPending,
    pendingScanType,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}
