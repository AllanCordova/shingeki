"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import { queryKeys } from "@/lib/query-keys";
import type {
  CatalogImportResponse,
  CatalogImportStatusResponse,
} from "@/lib/contracts";

export function useCatalogImportStatus(importId: string | null, enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.catalogImport(importId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<CatalogImportStatusResponse>(
        `/catalog/imports/${importId}`,
      );
      return data.import;
    },
    enabled: enabled && Boolean(importId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "PENDING" || status === "PROCESSING" ? 2000 : false;
    },
  });

  return {
    importJob: query.data,
    isLoading: query.isLoading,
    error: (query.error as ApiError | null) ?? null,
  };
}

export function useUploadCatalogImport(path: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post<CatalogImportResponse>(path, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificationsAll });
    },
  });

  return {
    upload: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function downloadCatalogTemplate(path: string) {
  window.open(path, "_blank", "noopener,noreferrer");
}
