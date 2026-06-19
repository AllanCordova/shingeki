"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import { queryKeys } from "@/lib/query-keys";
import type {
  CatalogRemediationCreateInput,
  CatalogRemediationResponse,
  CatalogRemediationsResponse,
} from "@/lib/contracts";
import { parseCatalogRemediationPayload } from "@/lib/contracts";

async function fetchCatalogRemediations() {
  const { data } = await apiClient.get<CatalogRemediationsResponse>(
    "/catalog/remediations",
  );
  return data.remediations;
}

export function useCatalogRemediations(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.catalogRemediations,
    queryFn: fetchCatalogRemediations,
    enabled,
  });

  return {
    remediations: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useCreateCatalogRemediation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (
      input: ReturnType<typeof parseCatalogRemediationPayload>,
    ) => {
      const { data } = await apiClient.post<CatalogRemediationResponse>(
        "/catalog/remediations",
        input,
      );
      return data.remediation;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.catalogRemediations,
      });
    },
  });

  return {
    createRemediation: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function useDeleteCatalogRemediation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (remediationId: string) => {
      await apiClient.delete(`/catalog/remediations/${remediationId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.catalogRemediations,
      });
    },
  });

  return {
    deleteRemediation: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
  };
}

export type { CatalogRemediationCreateInput };
