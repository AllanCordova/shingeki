"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type { ResultsQueryParams, ResultsResponse } from "@/lib/contracts";
import { DEFAULT_PAGE_SIZE } from "@/lib/contracts/common";
import { queryKeys } from "@/lib/query-keys";

const DEFAULT_RESULTS_QUERY: Required<ResultsQueryParams> = {
  page: 1,
  per_page: DEFAULT_PAGE_SIZE,
  results_page: 1,
  results_per_page: DEFAULT_PAGE_SIZE,
  filter: "all",
};

function buildResultsQuery(params?: ResultsQueryParams): Required<ResultsQueryParams> {
  return {
    page: params?.page ?? DEFAULT_RESULTS_QUERY.page,
    per_page: params?.per_page ?? DEFAULT_RESULTS_QUERY.per_page,
    results_page: params?.results_page ?? DEFAULT_RESULTS_QUERY.results_page,
    results_per_page: params?.results_per_page ?? DEFAULT_RESULTS_QUERY.results_per_page,
    filter: params?.filter ?? DEFAULT_RESULTS_QUERY.filter,
  };
}

export function useDispatches(projectId: string, systemId: string) {
  const query = useQuery({
    queryKey: queryKeys.dispatches(projectId, systemId),
    queryFn: async () => {
      const { data } = await apiClient.get<{ dispatches: ResultsResponse["dispatch"][] }>(
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

export function useResults(
  projectId: string,
  systemId: string,
  dispatchId: string,
  params?: ResultsQueryParams,
) {
  const queryParams = buildResultsQuery(params);

  const query = useQuery({
    queryKey: queryKeys.results(projectId, systemId, dispatchId, queryParams),
    queryFn: async () => {
      const search = new URLSearchParams({
        page: String(queryParams.page),
        per_page: String(queryParams.per_page),
        results_page: String(queryParams.results_page),
        results_per_page: String(queryParams.results_per_page),
        filter: queryParams.filter,
      });

      const { data } = await apiClient.get<ResultsResponse>(
        `/projects/${projectId}/systems/${systemId}/system-results/${dispatchId}?${search.toString()}`,
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
    resultsPagination: query.data?.results_pagination,
    probes: query.data?.probes ?? [],
    probesPagination: query.data?.probes_pagination,
    probeCounts: query.data?.probe_counts,
    filter: query.data?.filter ?? queryParams.filter,
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
        queryKey: ["projects", projectId, "systems", systemId, "dispatches", dispatchId],
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
