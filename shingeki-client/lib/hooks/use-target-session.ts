"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type {
  StoreTargetSessionInput,
  StoreTargetSessionResponse,
  TargetSessionStatus,
} from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";

const basePath = (projectId: string, systemId: string) =>
  `/projects/${projectId}/systems/${systemId}/target-session`;

export function useTargetSession(projectId: string, systemId: string) {
  const query = useQuery({
    queryKey: queryKeys.targetSession(projectId, systemId),
    queryFn: async () => {
      const { data } = await apiClient.get<TargetSessionStatus>(
        basePath(projectId, systemId),
      );
      return data;
    },
  });

  return {
    session: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useStoreTargetSession(projectId: string, systemId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: StoreTargetSessionInput) => {
      const { data } = await apiClient.post<StoreTargetSessionResponse>(
        basePath(projectId, systemId),
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.targetSession(projectId, systemId),
      });
    },
  });

  return {
    storeSession: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function useRevokeTargetSession(projectId: string, systemId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.delete<{ message: string }>(
        basePath(projectId, systemId),
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.targetSession(projectId, systemId),
      });
    },
  });

  return {
    revokeSession: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}
