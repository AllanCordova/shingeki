"use client";

import { useMemo } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { ApiError } from "@/lib/api/error-handler";
import {
  SIDEBAR_NAVIGATION_QUERY,
  SYNC_SIDEBAR_NAVIGATION_MUTATION,
  mapSidebarNavigation,
  toSidebarNavItemInputs,
} from "@/lib/graphql/sidebar-navigation";
import type {
  SidebarNavItem,
  SidebarNavProject,
  SidebarNavigationResponse,
} from "@/lib/contracts";
import { useMe } from "@/lib/hooks/auth/use-auth";

type SidebarNavigationQueryData = {
  sidebarNavigation: Parameters<typeof mapSidebarNavigation>[0];
};

type SyncSidebarNavigationData = {
  syncSidebarNavigation: Parameters<typeof mapSidebarNavigation>[0];
};

const EMPTY_ITEMS: SidebarNavItem[] = [];
const EMPTY_SIDEBAR: SidebarNavProject[] = [];

function toApiError(error: unknown): ApiError {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "Não foi possível carregar a navegação da sidebar.";

  return new ApiError({
    status: 0,
    message,
    fieldErrors: {},
  });
}

export function useSidebarNavigation() {
  const { user } = useMe();
  const enabled = Boolean(user?.id);

  const query = useQuery<SidebarNavigationQueryData>(SIDEBAR_NAVIGATION_QUERY, {
    skip: !enabled,
  });

  const mapped = useMemo(
    () =>
      query.data?.sidebarNavigation
        ? mapSidebarNavigation(query.data.sidebarNavigation)
        : undefined,
    [query.data],
  );

  return {
    meta: mapped?.meta,
    sidebar: mapped?.sidebar ?? EMPTY_SIDEBAR,
    items: mapped?.items ?? EMPTY_ITEMS,
    isLoading: enabled && query.loading && !mapped,
    isError: Boolean(query.error),
    error: query.error ? toApiError(query.error) : null,
    refetch: query.refetch,
  };
}

export function useUpdateSidebarNavigation() {
  const client = useApolloClient();
  const [mutate, mutation] = useMutation<SyncSidebarNavigationData>(
    SYNC_SIDEBAR_NAVIGATION_MUTATION,
  );

  return {
    updateSidebar: async (items: SidebarNavigationResponse["items"]) => {
      const result = await mutate({
        variables: { items: toSidebarNavItemInputs(items) },
      });

      const payload = result.data?.syncSidebarNavigation;
      if (!payload) {
        throw toApiError(result.error ?? new Error("Falha ao salvar a sidebar."));
      }

      client.writeQuery({
        query: SIDEBAR_NAVIGATION_QUERY,
        data: { sidebarNavigation: payload },
      });

      return mapSidebarNavigation(payload);
    },
    isLoading: mutation.loading,
    error: mutation.error ? toApiError(mutation.error) : null,
  };
}
