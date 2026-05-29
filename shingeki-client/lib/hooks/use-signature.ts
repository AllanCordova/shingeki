"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type {
  SignatureGenerateResponse,
  SignatureValidateResponse,
} from "@/lib/contracts";

const basePath = (projectId: string, systemId: string) =>
  `/projects/${projectId}/systems/${systemId}/signatures`;

export function useGenerateSignature(projectId: string, systemId: string) {
  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<SignatureGenerateResponse>(
        `${basePath(projectId, systemId)}/generate`,
      );
      return data;
    },
  });

  return {
    generate: mutation.mutateAsync,
    data: mutation.data,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function useValidateSignature(projectId: string, systemId: string) {
  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<SignatureValidateResponse>(
        `${basePath(projectId, systemId)}/validate`,
      );
      return data;
    },
  });

  return {
    validate: mutation.mutateAsync,
    data: mutation.data,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function useRevokeSignature(projectId: string, systemId: string) {
  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ message: string }>(
        `${basePath(projectId, systemId)}/revoke`,
      );
      return data;
    },
  });

  return {
    revoke: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}
