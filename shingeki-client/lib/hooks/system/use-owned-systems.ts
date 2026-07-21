"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type { System, SystemResponse, SystemsResponse } from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";

const EMPTY_OWNED_SYSTEMS: System[] = [];

export function useOwnedSystems() {
  const query = useQuery({
    queryKey: queryKeys.ownedSystemsAll,
    queryFn: async () => {
      const { data } = await apiClient.get<SystemsResponse>("/systems");
      return data.systems;
    },
  });

  return {
    systems: query.data ?? EMPTY_OWNED_SYSTEMS,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useOwnedSystem(systemId: string) {
  const query = useQuery({
    queryKey: queryKeys.ownedSystem(systemId),
    queryFn: async () => {
      const { data } = await apiClient.get<SystemResponse>(
        `/systems/${systemId}`,
      );
      return data.system;
    },
    enabled: Boolean(systemId),
  });

  return {
    system: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useUpdateSystemDispatchSettings(systemId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: {
      dast_start_path: string | null;
      dast_max_routes: number | null;
    }) => {
      const { data } = await apiClient.put<SystemResponse>(
        `/systems/${systemId}/dispatch-settings`,
        input,
      );
      return data.system;
    },
    onSuccess: (system: System) => {
      queryClient.setQueryData(queryKeys.ownedSystem(systemId), system);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.ownedSystemsAll,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.systems(system.project_id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.system(system.project_id, systemId),
      });
    },
  });

  return {
    updateDispatchSettings: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}
