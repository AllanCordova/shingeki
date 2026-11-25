import type { PaginationMeta } from "../common/common";

export type BrowserCaptureStatus = "pending" | "completed" | "expired";
export type BrowserCaptureSource = "remote_browser" | "manual_import" | null;

export interface AdminBrowserCaptureListItem {
  id: string;
  status: BrowserCaptureStatus;
  source: BrowserCaptureSource;
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
  system: {
    id: string | null;
    name: string | null;
    target_url: string | null;
  };
  project: {
    id: string | null;
    name: string | null;
  };
  created_at: string | null;
  browser_opened_at: string | null;
  consumed_at: string | null;
  expires_at: string | null;
  ip_address: string | null;
  navigated_count: number;
  dispatch_id: string | null;
}

export interface AdminBrowserCaptureEvent {
  id: string;
  event: string;
  url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  meta: Record<string, unknown> | null;
  created_at: string | null;
}

export interface AdminBrowserCaptureDetail extends AdminBrowserCaptureListItem {
  browser_opened_ip: string | null;
  browser_opened_user_agent: string | null;
  user_agent: string | null;
  events: AdminBrowserCaptureEvent[];
}

export interface AdminBrowserCapturesQueryParams {
  page?: number;
  per_page?: number;
  user_id?: string;
  system_id?: string;
  source?: string;
  status?: BrowserCaptureStatus | "";
  from?: string;
  to?: string;
}

export interface AdminBrowserCapturesResponse {
  captures: AdminBrowserCaptureListItem[];
  pagination: PaginationMeta;
}

export interface AdminBrowserCaptureDetailResponse {
  capture: AdminBrowserCaptureDetail;
}
