"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import { ATTACK_ACKNOWLEDGMENT } from "@/lib/contracts/attack/attack-acknowledgment";
import type {
  SessionCapture,
  SessionCaptureCreated,
  SessionCaptureScope,
} from "@/lib/contracts/attack/session-capture";
function capturePath(projectId: string, systemId: string): string {
  return `/projects/${projectId}/systems/${systemId}/attacks/session-captures`;
}

export function useCreateSessionCapture(projectId: string, systemId: string) {
  const mutation = useMutation({
    mutationFn: async ({
      acceptedResponsibility,
      acceptedLegalTerms,
      scope,
    }: {
      acceptedResponsibility: boolean;
      acceptedLegalTerms: boolean;
      scope: SessionCaptureScope;
    }) => {
      const { data } = await apiClient.post<SessionCaptureCreated>(
        capturePath(projectId, systemId),
        {
          accepted_responsibility: acceptedResponsibility,
          accepted_legal_terms: acceptedLegalTerms,
          terms_version: ATTACK_ACKNOWLEDGMENT.termsVersion,
          depth: scope.depth,
          ...(scope.start_path ? { start_path: scope.start_path } : {}),
          ...(typeof scope.max_routes === "number"
            ? { max_routes: scope.max_routes }
            : {}),
          ...(scope.route_map && scope.route_map.length > 0
            ? { route_map: scope.route_map }
            : {}),
        },
      );
      return data;
    },
  });

  return {
    createCapture: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
  };
}

export function useSessionCapture(
  projectId: string,
  systemId: string,
  captureId: string | null,
) {
  const query = useQuery({
    queryKey: ["session-capture", projectId, systemId, captureId],
    enabled: Boolean(captureId),
    queryFn: async () => {
      const { data } = await apiClient.get<{ capture: SessionCapture }>(
        `${capturePath(projectId, systemId)}/${captureId}`,
      );
      return data.capture;
    },
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 2000 : false,
  });

  return {
    capture: query.data ?? null,
    isLoading: query.isLoading,
    error: (query.error as ApiError | null) ?? null,
  };
}

export function useOpenCaptureBrowser(projectId: string, systemId: string) {
  const mutation = useMutation({
    mutationFn: async ({
      captureId,
      token,
    }: {
      captureId: string;
      token: string;
    }) => {
      const { data } = await apiClient.post<{ novnc_url: string }>(
        `${capturePath(projectId, systemId)}/${captureId}/browser`,
        { token },
      );
      return data;
    },
  });

  return {
    openBrowser: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
  };
}
