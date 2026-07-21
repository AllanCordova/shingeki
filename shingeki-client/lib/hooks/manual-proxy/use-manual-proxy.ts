"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type {
  ManualProxySendPayload,
  ManualProxySendResponse,
  ManualRouteMapInput,
  ManualRouteMapResponse,
  ManualRouteMapsResponse,
} from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";
import { buildRouteMapPayload } from "@/lib/contracts/manual-proxy/manual-proxy";

export function useManualRouteMaps(projectId: string, systemId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.manualProxyRoutes(projectId, systemId),
    queryFn: async () => {
      const { data } = await apiClient.get<ManualRouteMapsResponse>(
        `/projects/${projectId}/systems/${systemId}/manual-proxy/routes`,
      );
      return data.routes;
    },
    enabled: enabled && Boolean(projectId) && Boolean(systemId),
  });
}

export function useSendManualProxy(projectId: string, systemId: string) {
  const mutation = useMutation({
    mutationFn: async (payload: ManualProxySendPayload) => {
      const { data } = await apiClient.post<ManualProxySendResponse>(
        `/projects/${projectId}/systems/${systemId}/manual-proxy/send`,
        payload,
      );
      return data;
    },
  });

  return {
    sendRequest: mutation.mutateAsync,
    data: mutation.data,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function useSaveManualRouteMap(projectId: string, systemId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: ManualRouteMapInput & { routeId?: string }) => {
      const body = buildRouteMapPayload(input);
      if (input.routeId) {
        const { data } = await apiClient.put<ManualRouteMapResponse>(
          `/projects/${projectId}/systems/${systemId}/manual-proxy/routes/${input.routeId}`,
          body,
        );
        return data.route;
      }

      const { data } = await apiClient.post<ManualRouteMapResponse>(
        `/projects/${projectId}/systems/${systemId}/manual-proxy/routes`,
        body,
      );
      return data.route;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manualProxyRoutes(projectId, systemId),
      });
    },
  });

  return {
    saveRoute: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
  };
}

export function useDeleteManualRouteMap(projectId: string, systemId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (routeId: string) => {
      await apiClient.delete(
        `/projects/${projectId}/systems/${systemId}/manual-proxy/routes/${routeId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.manualProxyRoutes(projectId, systemId),
      });
    },
  });

  return {
    deleteRoute: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
  };
}
