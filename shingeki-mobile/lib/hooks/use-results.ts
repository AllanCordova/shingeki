import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type { AttackDispatch } from "@/lib/contracts";
import { isDispatchCompleted } from "@/lib/dispatch-status";
import { queryKeys } from "@/lib/query-keys";
import type { DispatchesResponse, ResultsResponse } from "@/lib/contracts";
import { useRefetchOnFocus } from "@/lib/hooks/use-refetch-on-focus";

const RESULTS_POLL_MS = 5000;

function hasPendingDispatches(
  dispatches: AttackDispatch[] | undefined,
): boolean {
  return dispatches?.some((d) => !isDispatchCompleted(d)) ?? false;
}

function isDispatchPending(dispatch: AttackDispatch | undefined): boolean {
  if (!dispatch) return false;
  return !isDispatchCompleted(dispatch);
}

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
    refetchOnMount: "always",
    refetchInterval: (q) =>
      hasPendingDispatches(q.state.data) ? RESULTS_POLL_MS : false,
  });

  useRefetchOnFocus(query.refetch);

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
    refetchOnMount: "always",
    refetchInterval: (q) =>
      isDispatchPending(q.state.data?.dispatch) ? RESULTS_POLL_MS : false,
  });

  useRefetchOnFocus(query.refetch);

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
