import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import { queryKeys } from "@/lib/query-keys";
import type { DispatchesResponse, ResultsResponse } from "@/lib/contracts";

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
      const status = query.state.data?.dispatch?.status;
      return status === "pending" ? 5000 : false;
    },
  });

  return {
    dispatch: query.data?.dispatch,
    results: query.data?.results ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}
