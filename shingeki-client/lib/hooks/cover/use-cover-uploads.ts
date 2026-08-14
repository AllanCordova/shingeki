"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import { MAX_COVER_UPLOADS } from "@/lib/cover/cover-library";
import type { CoverUpload, CoverUploadsResponse } from "@/lib/contracts/cover/cover-upload";
import { queryKeys } from "@/lib/query-keys";

const EMPTY_COVER_UPLOADS: CoverUpload[] = [];

export function useCoverUploads() {
  const query = useQuery({
    queryKey: queryKeys.coverUploads,
    queryFn: async () => {
      const { data } = await apiClient.get<CoverUploadsResponse>("/cover-uploads");
      return data;
    },
  });

  const uploads = query.data?.cover_uploads ?? EMPTY_COVER_UPLOADS;
  const count = query.data?.count ?? uploads.length;
  const limit = query.data?.limit ?? MAX_COVER_UPLOADS;
  const atLimit = count >= limit;

  return {
    uploads,
    count,
    limit,
    atLimit,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useDeleteCoverUpload() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (uploadId: string) => {
      await apiClient.delete(`/cover-uploads/${uploadId}`);
      return uploadId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coverUploads });
    },
  });

  return {
    deleteCoverUpload: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export type { CoverUpload };
