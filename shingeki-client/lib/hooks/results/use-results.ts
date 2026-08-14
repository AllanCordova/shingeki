"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type { ResultsQueryParams, ResultsResponse } from "@/lib/contracts";
import { DEFAULT_PAGE_SIZE } from "@/lib/contracts/common/common";
import { queryKeys } from "@/lib/query-keys";

const EMPTY_DISPATCHES: ResultsResponse["dispatch"][] = [];
const EMPTY_RESULTS: NonNullable<ResultsResponse["results"]> = [];
const EMPTY_PROBES: NonNullable<ResultsResponse["probes"]> = [];

const DEFAULT_RESULTS_QUERY: Required<ResultsQueryParams> = {
  page: 1,
  per_page: DEFAULT_PAGE_SIZE,
  results_page: 1,
  results_per_page: DEFAULT_PAGE_SIZE,
  filter: "all",
  category: "",
  risk_level: "",
  route: "",
  q: "",
};

function buildResultsQuery(params?: ResultsQueryParams): Required<ResultsQueryParams> {
  return {
    page: params?.page ?? DEFAULT_RESULTS_QUERY.page,
    per_page: params?.per_page ?? DEFAULT_RESULTS_QUERY.per_page,
    results_page: params?.results_page ?? DEFAULT_RESULTS_QUERY.results_page,
    results_per_page: params?.results_per_page ?? DEFAULT_RESULTS_QUERY.results_per_page,
    filter: params?.filter ?? DEFAULT_RESULTS_QUERY.filter,
    category: params?.category ?? DEFAULT_RESULTS_QUERY.category,
    risk_level: params?.risk_level ?? DEFAULT_RESULTS_QUERY.risk_level,
    route: params?.route ?? DEFAULT_RESULTS_QUERY.route,
    q: params?.q ?? DEFAULT_RESULTS_QUERY.q,
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
    dispatches: query.data ?? EMPTY_DISPATCHES,
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

      if (queryParams.category) search.set("category", queryParams.category);
      if (queryParams.risk_level) search.set("risk_level", queryParams.risk_level);
      if (queryParams.route) search.set("route", queryParams.route);
      if (queryParams.q) search.set("q", queryParams.q);

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
    results: query.data?.results ?? EMPTY_RESULTS,
    resultsPagination: query.data?.results_pagination,
    probes: query.data?.probes ?? EMPTY_PROBES,
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
        queryKey: queryKeys.dispatch(projectId, systemId, dispatchId),
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
        queryKey: queryKeys.dispatches(projectId, systemId),
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
