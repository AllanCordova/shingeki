"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import {
  buildCatalogListQuery,
  fetchCatalogList,
} from "@/lib/catalog/list-query";
import type {
  CatalogAttackResponse,
  CatalogAttacksResponse,
  CatalogListQueryParams,
} from "@/lib/contracts";
import { parseCatalogAttackPayload } from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";

const EMPTY_ATTACKS: CatalogAttacksResponse["attacks"] = [];
const EMPTY_OWNERS: NonNullable<CatalogAttacksResponse["owners"]> = [];

export function useCatalogAttacks(params?: CatalogListQueryParams, enabled = true) {
  const listQuery = buildCatalogListQuery(params);

  const query = useQuery({
    queryKey: queryKeys.catalogAttacks(listQuery),
    queryFn: () => fetchCatalogList<CatalogAttacksResponse>("/catalog/attacks", listQuery),
    enabled,
  });

  return {
    attacks: query.data?.attacks ?? EMPTY_ATTACKS,
    pagination: query.data?.pagination,
    owners: query.data?.owners ?? EMPTY_OWNERS,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useCreateCatalogAttack() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (
      input: ReturnType<typeof parseCatalogAttackPayload>,
    ) => {
      const { data } = await apiClient.post<CatalogAttackResponse>(
        "/catalog/attacks",
        input,
      );
      return data.attack;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalogAttacksAll });
    },
  });

  return {
    createAttack: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function useDeleteCatalogAttack() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (attackId: string) => {
      await apiClient.delete(`/catalog/attacks/${attackId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalogAttacksAll });
    },
  });

  return {
    deleteAttack: mutation.mutateAsync,
    deletingId: mutation.isPending ? (mutation.variables ?? null) : null,
    error: (mutation.error as ApiError | null) ?? null,
  };
}
