"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error-handler";
import { queryKeys } from "@/lib/query-keys";
import type {
  System,
  SystemCreateInput,
  SystemResponse,
  SystemUpdateInput,
  SystemsResponse,
} from "@/lib/contracts";
import {
  buildSystemCreateFormData,
  buildSystemUpdateFormData,
} from "@/lib/multipart";
import { invalidateSidebarNavigation } from "@/lib/graphql/apollo-client";

const EMPTY_SYSTEMS: System[] = [];

export function useSystems(projectId: string, options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: queryKeys.systems(projectId),
    queryFn: async () => {
      const { data } = await apiClient.get<SystemsResponse>(
        `/projects/${projectId}/systems`,
      );
      return data.systems;
    },
    enabled: Boolean(projectId) && (options?.enabled ?? true),
  });

  return {
    systems: query.data ?? EMPTY_SYSTEMS,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useSystem(projectId: string, systemId: string) {
  const query = useQuery({
    queryKey: queryKeys.system(projectId, systemId),
    queryFn: async () => {
      const { data } = await apiClient.get<SystemResponse>(
        `/projects/${projectId}/systems/${systemId}`,
      );
      return data.system;
    },
    enabled: Boolean(projectId) && Boolean(systemId),
  });

  return {
    system: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useCreateSystem(projectId?: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (
      input: SystemCreateInput & { projectId?: string },
    ) => {
      const { projectId: requestedProjectId, ...payload } = input;
      const id = requestedProjectId ?? projectId;
      if (!id) {
        throw new ApiError({
          status: 400,
          message: "Projeto obrigatorio.",
          fieldErrors: {},
        });
      }

      const { data } = await apiClient.post<SystemResponse>(
        `/projects/${id}/systems`,
        buildSystemCreateFormData(payload),
      );
      return { system: data.system, projectId: id };
    },
    onSuccess: ({ projectId: id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.systems(id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.coverUploads });
      invalidateSidebarNavigation();
    },
  });

  return {
    createSystem: async (input: SystemCreateInput & { projectId?: string }) => {
      const result = await mutation.mutateAsync(input);
      return result.system;
    },
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function useUpdateSystem(projectId: string, systemId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: SystemUpdateInput) => {
      const formData = buildSystemUpdateFormData(input);

      const { data } = formData
        ? await apiClient.put<SystemResponse>(
            `/projects/${projectId}/systems/${systemId}`,
            formData,
          )
        : await apiClient.put<SystemResponse>(
            `/projects/${projectId}/systems/${systemId}`,
            input,
          );

      return data.system;
    },
    onSuccess: (system: System) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.systems(projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.coverUploads });
      queryClient.setQueryData(queryKeys.system(projectId, systemId), system);
      invalidateSidebarNavigation();
    },
  });

  return {
    updateSystem: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function useDeleteSystem(projectId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (systemId: string) => {
      await apiClient.delete(`/projects/${projectId}/systems/${systemId}`);
      return systemId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.systems(projectId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.coverUploads });
      invalidateSidebarNavigation();
    },
  });

  return {
    deleteSystem: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
  };
}
