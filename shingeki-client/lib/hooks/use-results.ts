"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import { queryKeys } from "@/lib/query-keys";
import type { DispatchesResponse, ResultsResponse } from "@/lib/contracts";

/**
 * Lista de disparos de um sistema.
 *
 * ALTA VOLATILIDADE: o status muda de "pending" para "completed" no worker.
 * Por isso usamos staleTime 0 + polling (refetchInterval) enquanto houver
 * algum disparo pendente; ao concluir todos, o polling para.
 */
export function useDispatches(projectId: string, systemId: string) {
  const query = useQuery({
    queryKey: queryKeys.dispatches(projectId, systemId),
    queryFn: async () => {
      const { data } = await apiClient.get<DispatchesResponse>(
        `/projects/${projectId}/systems/${systemId}/system-results`,
      );
      return data.dispatches;
    },
    enabled: Boolean(projectId) && Boolean(systemId),
    staleTime: 0,
    refetchInterval: (query) => {
      const dispatches = query.state.data;
      const hasPending = dispatches?.some((d) => d.status === "pending");
      return hasPending ? 5000 : false;
    },
  });

  return {
    dispatches: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

/**
 * Resultados detalhados de um disparo (polling enquanto o disparo nao conclui).
 */
export function useResults(
  projectId: string,
  systemId: string,
  dispatchId: string,
) {
  const query = useQuery({
    queryKey: queryKeys.results(projectId, systemId, dispatchId),
    queryFn: async () => {
      const { data } = await apiClient.get<ResultsResponse>(
        `/projects/${projectId}/systems/${systemId}/system-results/${dispatchId}`,
      );
      return data;
    },
    enabled: Boolean(projectId) && Boolean(systemId) && Boolean(dispatchId),
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.dispatch.status;
      return status === "pending" ? 5000 : false;
    },
  });

  return {
    dispatch: query.data?.dispatch,
    results: query.data?.results ?? [],
    probes: query.data?.probes ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useDeleteDispatch(projectId: string, systemId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (dispatchId: string) => {
      await apiClient.delete(
        `/projects/${projectId}/systems/${systemId}/system-results/${dispatchId}`,
      );
      return dispatchId;
    },
    onSuccess: (dispatchId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dispatches(projectId, systemId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.results(projectId, systemId, dispatchId),
      });
    },
  });

  return {
    deleteDispatch: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function useDeleteAllDispatches(projectId: string, systemId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(
        `/projects/${projectId}/systems/${systemId}/system-results`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.dispatches(projectId, systemId),
      });
      queryClient.removeQueries({
        queryKey: ["projects", projectId, "systems", systemId, "dispatches"],
      });
    },
  });

  return {
    deleteAllDispatches: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}
