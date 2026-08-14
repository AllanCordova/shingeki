"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type { SidebarNavigationResponse, User } from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";
import { useMe } from "@/lib/hooks/auth/use-auth";

export function useSidebarNavigation() {
  const { user } = useMe();
  const userId = user?.id;

  const query = useQuery({
    queryKey: queryKeys.sidebarNavigation(userId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<SidebarNavigationResponse>("/navigation/sidebar");
      return data;
    },
    enabled: Boolean(userId),
  });

  return {
    meta: query.data?.meta,
    sidebar: query.data?.sidebar ?? [],
    items: query.data?.items ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useUpdateSidebarNavigation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (items: SidebarNavigationResponse["items"]) => {
      const { data } = await apiClient.put<SidebarNavigationResponse>("/navigation/sidebar", {
        items: items.map((item) => ({
          project_id: item.project_id,
          system_id: item.system_id,
          visible: item.visible,
          sort_order: item.sort_order,
        })),
      });
      return data;
    },
    onSuccess: (data) => {
      const user = queryClient.getQueryData<User>(queryKeys.me);
      if (!user?.id) return;

      queryClient.setQueryData(queryKeys.sidebarNavigation(user.id), data);
    },
  });

  return {
    updateSidebar: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
  };
}
