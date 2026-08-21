export type Timestamps = {
  created_at: string | null;
  updated_at: string | null;
};

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export const DEFAULT_PAGE_SIZE = 25;
export const NOTIFICATION_BELL_PAGE_SIZE = 10;
export const SIDEBAR_NAV_PAGE_SIZE = 10;
