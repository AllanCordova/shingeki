"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import {
  buildCatalogListQuery,
  fetchCatalogList,
} from "@/lib/catalog/list-query";
import type {
  CatalogListQueryParams,
  CatalogRemediationResponse,
  CatalogRemediationsResponse,
} from "@/lib/contracts";
import { parseCatalogRemediationPayload } from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";

const EMPTY_REMEDIATIONS: CatalogRemediationsResponse["remediations"] = [];
const EMPTY_OWNERS: NonNullable<CatalogRemediationsResponse["owners"]> = [];

export function useCatalogRemediations(
  params?: CatalogListQueryParams,
  enabled = true,
) {
  const listQuery = buildCatalogListQuery(params);

  const query = useQuery({
    queryKey: queryKeys.catalogRemediations(listQuery),
    queryFn: () =>
      fetchCatalogList<CatalogRemediationsResponse>("/catalog/remediations", listQuery),
    enabled,
  });

  return {
    remediations: query.data?.remediations ?? EMPTY_REMEDIATIONS,
    pagination: query.data?.pagination,
    owners: query.data?.owners ?? EMPTY_OWNERS,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalogRemediationsAll });
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalogRemediationsAll });
    },
  });

  return {
    deleteRemediation: mutation.mutateAsync,
    deletingId: mutation.isPending ? (mutation.variables ?? null) : null,
    error: (mutation.error as ApiError | null) ?? null,
  };
}
