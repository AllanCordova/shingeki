import type { PaginationMeta } from "../common/common";

export interface CatalogAuthor {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface CatalogListQueryParams {
  page?: number;
  per_page?: number;
  user_id?: string | null;
}

export interface CatalogListResponseMeta {
  pagination: PaginationMeta;
  owners: CatalogAuthor[];
}
