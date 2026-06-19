import type { PaginationMeta } from "./common";

/** Author of a catalog item (attack or remediation). */
export interface CatalogAuthor {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** @deprecated Use CatalogAuthor */
export type CatalogOwner = CatalogAuthor;

export interface CatalogListQueryParams {
  page?: number;
  per_page?: number;
  user_id?: string | null;
}

export interface CatalogListResponseMeta {
  pagination: PaginationMeta;
  owners: CatalogAuthor[];
}
