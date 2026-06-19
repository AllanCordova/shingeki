import { apiClient } from "@/lib/api/client";
import type { CatalogListQueryParams } from "@/lib/contracts";
import { DEFAULT_PAGE_SIZE } from "@/lib/contracts/common";

export type ResolvedCatalogListQuery = Required<
  Pick<CatalogListQueryParams, "page" | "per_page">
> &
  Pick<CatalogListQueryParams, "user_id">;

export function buildCatalogListQuery(
  params?: CatalogListQueryParams,
): ResolvedCatalogListQuery {
  return {
    page: params?.page ?? 1,
    per_page: params?.per_page ?? DEFAULT_PAGE_SIZE,
    user_id: params?.user_id ?? null,
  };
}

export function buildCatalogListSearchParams(params: ResolvedCatalogListQuery) {
  const search = new URLSearchParams({
    page: String(params.page),
    per_page: String(params.per_page),
  });

  if (params.user_id) {
    search.set("user_id", params.user_id);
  }

  return search.toString();
}

export async function fetchCatalogList<T>(
  path: string,
  params?: CatalogListQueryParams,
): Promise<T> {
  const query = buildCatalogListQuery(params);
  const { data } = await apiClient.get<T>(
    `${path}?${buildCatalogListSearchParams(query)}`,
  );

  return data;
}
