import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type { CoverStockImagesResponse } from "@/lib/contracts/cover/cover-stock-image";
import { queryKeys } from "@/lib/query-keys";

const DEFAULT_QUERY = "technology abstract";
const EMPTY_STOCK_IMAGES: CoverStockImagesResponse["images"] = [];

type UseCoverStockImagesOptions = {
  query?: string;
  enabled?: boolean;
};

export function useCoverStockImages(options: UseCoverStockImagesOptions = {}) {
  const searchQuery = options.query?.trim() || DEFAULT_QUERY;
  const enabled = options.enabled ?? true;

  const query = useQuery({
    queryKey: queryKeys.coverStockImages(searchQuery),
    queryFn: async () => {
      const { data } = await apiClient.get<CoverStockImagesResponse>(
        "/cover-stock-images",
        { params: { query: searchQuery, per_page: 12 } },
      );
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    images: query.data?.images ?? EMPTY_STOCK_IMAGES,
    searchQuery: query.data?.query ?? searchQuery,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}
