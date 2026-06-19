"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import { queryKeys } from "@/lib/query-keys";
import type {
  CatalogAttackCreateInput,
  CatalogAttackResponse,
  CatalogAttacksResponse,
} from "@/lib/contracts";
import { parseCatalogAttackPayload } from "@/lib/contracts";

async function fetchCatalogAttacks() {
  const { data } = await apiClient.get<CatalogAttacksResponse>(
    "/catalog/attacks",
  );
  return data.attacks;
}

export function useCatalogAttacks(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.catalogAttacks,
    queryFn: fetchCatalogAttacks,
    enabled,
  });

  return {
    attacks: query.data ?? [],
    isLoading: query.isLoading,
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalogAttacks });
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalogAttacks });
    },
  });

  return {
    deleteAttack: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
  };
}

export type { CatalogAttackCreateInput };
