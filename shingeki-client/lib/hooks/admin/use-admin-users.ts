"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type {
  AdminUsersQueryParams,
  AdminUsersResponse,
  UpdateAdminUserRoleResponse,
  UserRole,
} from "@/lib/contracts";
import { DEFAULT_PAGE_SIZE } from "@/lib/contracts/common/common";
import { queryKeys } from "@/lib/query-keys";

const EMPTY_ADMIN_USERS: NonNullable<AdminUsersResponse["users"]> = [];

function buildAdminUsersQuery(params?: AdminUsersQueryParams) {
  return {
    page: params?.page ?? 1,
    per_page: params?.per_page ?? DEFAULT_PAGE_SIZE,
    search: params?.search?.trim() || undefined,
    role: params?.role,
  };
}

export function useAdminUsers(params?: AdminUsersQueryParams, enabled = true) {
  const listQuery = buildAdminUsersQuery(params);

  const query = useQuery({
    queryKey: queryKeys.adminUsers(listQuery),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set("page", String(listQuery.page));
      searchParams.set("per_page", String(listQuery.per_page));
      if (listQuery.search) {
        searchParams.set("search", listQuery.search);
      }
      if (listQuery.role) {
        searchParams.set("role", listQuery.role);
      }
      const { data } = await apiClient.get<AdminUsersResponse>(
        `/admin/users?${searchParams.toString()}`,
      );
      return data;
    },
    enabled,
  });

  return {
    users: query.data?.users ?? EMPTY_ADMIN_USERS,
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useUpdateAdminUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: UserRole;
    }) => {
      const { data } = await apiClient.put<UpdateAdminUserRoleResponse>(
        `/admin/users/${userId}`,
        { role },
      );
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsersAll });
    },
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await apiClient.delete<{ message: string }>(
        `/admin/users/${userId}`,
      );
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminUsersAll });
    },
  });
}
