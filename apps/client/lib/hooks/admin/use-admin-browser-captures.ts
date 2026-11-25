"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type {
  AdminBrowserCaptureDetailResponse,
  AdminBrowserCapturesQueryParams,
  AdminBrowserCapturesResponse,
} from "@/lib/contracts";
import { DEFAULT_PAGE_SIZE } from "@/lib/contracts/common/common";
import { queryKeys } from "@/lib/query-keys";

const EMPTY: AdminBrowserCapturesResponse["captures"] = [];

function buildQuery(params?: AdminBrowserCapturesQueryParams) {
  return {
    page: params?.page ?? 1,
    per_page: params?.per_page ?? DEFAULT_PAGE_SIZE,
    user_id: params?.user_id?.trim() || undefined,
    system_id: params?.system_id?.trim() || undefined,
    source: params?.source?.trim() || undefined,
    status: params?.status || undefined,
    from: params?.from || undefined,
    to: params?.to || undefined,
  };
}

export function useAdminBrowserCaptures(
  params?: AdminBrowserCapturesQueryParams,
  enabled = true,
) {
  const listQuery = buildQuery(params);

  const query = useQuery({
    queryKey: queryKeys.adminBrowserCaptures(listQuery),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set("page", String(listQuery.page));
      searchParams.set("per_page", String(listQuery.per_page));
      if (listQuery.user_id) searchParams.set("user_id", listQuery.user_id);
      if (listQuery.system_id) searchParams.set("system_id", listQuery.system_id);
      if (listQuery.source) searchParams.set("source", listQuery.source);
      if (listQuery.status) searchParams.set("status", listQuery.status);
      if (listQuery.from) searchParams.set("from", listQuery.from);
      if (listQuery.to) searchParams.set("to", listQuery.to);
      const { data } = await apiClient.get<AdminBrowserCapturesResponse>(
        `/admin/browser-captures?${searchParams.toString()}`,
      );
      return data;
    },
    enabled,
  });

  return {
    captures: query.data?.captures ?? EMPTY,
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useAdminBrowserCapture(captureId: string, enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.adminBrowserCapture(captureId),
    queryFn: async () => {
      const { data } = await apiClient.get<AdminBrowserCaptureDetailResponse>(
        `/admin/browser-captures/${captureId}`,
      );
      return data.capture;
    },
    enabled: enabled && Boolean(captureId),
  });

  return {
    capture: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export async function downloadBrowserCapturesCsv(
  params?: AdminBrowserCapturesQueryParams,
): Promise<void> {
  const listQuery = buildQuery(params);
  const searchParams = new URLSearchParams();
  if (listQuery.user_id) searchParams.set("user_id", listQuery.user_id);
  if (listQuery.system_id) searchParams.set("system_id", listQuery.system_id);
  if (listQuery.source) searchParams.set("source", listQuery.source);
  if (listQuery.status) searchParams.set("status", listQuery.status);
  if (listQuery.from) searchParams.set("from", listQuery.from);
  if (listQuery.to) searchParams.set("to", listQuery.to);

  const response = await fetch(
    `/api/admin/browser-captures/export?${searchParams.toString()}`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new Error("Não foi possível exportar o CSV.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `shingeki-browser-captures-${Date.now()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
