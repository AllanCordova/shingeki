"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import { ATTACK_ACKNOWLEDGMENT } from "@/lib/contracts/attack-acknowledgment";
import type {
  AttackDepth,
  AttackDiscoveryScope,
} from "@/lib/contracts/attack";
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

export function useDispatchAttack(projectId: string, systemId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      scanType,
      depth,
      start_path,
      max_routes,
      acceptedResponsibility,
      acceptedLegalTerms,
    }: {
      scanType: AttackScanType;
      depth: AttackDepth;
      start_path?: string;
      max_routes?: number;
      acceptedResponsibility: boolean;
      acceptedLegalTerms: boolean;
    }) => {
      const { data } = await apiClient.post<AttackDispatchResponse>(
        dispatchPath(projectId, systemId, scanType),
        {
          accepted_responsibility: acceptedResponsibility,
          accepted_legal_terms: acceptedLegalTerms,
          terms_version: ATTACK_ACKNOWLEDGMENT.termsVersion,
          depth,
          ...(start_path ? { start_path } : {}),
          ...(typeof max_routes === "number" ? { max_routes } : {}),
        },
      );
      return { ...data, scanType };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dispatches(projectId, systemId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificationsAll });
    },
  });

  const pendingScanType =
    mutation.isPending && mutation.variables ? mutation.variables.scanType : null;

  return {
    dispatchAttack: (
      scanType: AttackScanType,
      acknowledgment: {
        acceptedResponsibility: boolean;
        acceptedLegalTerms: boolean;
      },
      depth: AttackDepth = "full",
      scope: AttackDiscoveryScope = {},
    ) =>
      mutation.mutateAsync({
        scanType,
        depth,
        start_path: scope.start_path,
        max_routes: scope.max_routes,
        acceptedResponsibility: acknowledgment.acceptedResponsibility,
        acceptedLegalTerms: acknowledgment.acceptedLegalTerms,
      }),
    data: mutation.data,
    isLoading: mutation.isPending,
    pendingScanType,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}
