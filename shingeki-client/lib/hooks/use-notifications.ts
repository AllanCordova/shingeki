"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type {
  UserNotificationReadResponse,
  UserNotificationsResponse,
  UserNotificationUnreadCountResponse,
} from "@/lib/contracts";
import { NOTIFICATION_BELL_PAGE_SIZE } from "@/lib/contracts/common";
import { queryKeys } from "@/lib/query-keys";

const POLL_MS = 20_000;

export function useNotificationUnreadCount(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.notificationUnreadCount,
    queryFn: async () => {
      const { data } = await apiClient.get<UserNotificationUnreadCountResponse>(
        "/notifications/unread-count",
      );
      return data;
    },
    enabled,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });

  return {
    unreadCount: query.data?.unread_count ?? 0,
    pendingCount: query.data?.pending_count ?? 0,
    badgeCount: (query.data?.unread_count ?? 0) + (query.data?.pending_count ?? 0),
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useNotifications(
  page = 1,
  enabled = true,
  perPage = NOTIFICATION_BELL_PAGE_SIZE,
) {
  const query = useQuery({
    queryKey: queryKeys.notifications(page, perPage),
    queryFn: async () => {
      const { data } = await apiClient.get<UserNotificationsResponse>(
        `/notifications?page=${page}&per_page=${perPage}`,
      );
      return data;
    },
    enabled,
    refetchInterval: enabled ? POLL_MS : false,
    refetchOnWindowFocus: true,
  });

  return {
    notifications: query.data?.notifications ?? [],
    pagination: query.data?.pagination,
    unreadCount: query.data?.unread_count ?? 0,
    pendingCount: query.data?.pending_count ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await apiClient.patch<UserNotificationReadResponse>(
        `/notifications/${notificationId}/read`,
      );
      return data.notification;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificationsAll });
    },
  });

  return {
    markRead: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/notifications/read-all");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificationsAll });
    },
  });

  return {
    markAllRead: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.delete(`/notifications/${notificationId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificationsAll });
    },
  });

  return {
    deleteNotification: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}

export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete("/notifications");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificationsAll });
    },
  });

  return {
    deleteAllNotifications: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}

