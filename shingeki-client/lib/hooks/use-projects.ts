"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import { queryKeys } from "@/lib/query-keys";
import type {
  Project,
  ProjectCreateInput,
  ProjectResponse,
  ProjectUpdateInput,
  ProjectsResponse,
} from "@/lib/contracts";

/** Lista de projetos (baixa volatilidade). */
export function useProjects() {
  const query = useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      const { data } = await apiClient.get<ProjectsResponse>("/projects");
      return data.projects;
    },
  });

  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useProject(projectId: string) {
  const query = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: async () => {
      const { data } = await apiClient.get<ProjectResponse>(
        `/projects/${projectId}`,
      );
      return data.project;
    },
    enabled: Boolean(projectId),
  });

  return {
    project: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: ProjectCreateInput) => {
      const { data } = await apiClient.post<ProjectResponse>(
        "/projects",
        input,
      );
      return data.project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });

  return {
    createProject: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: ProjectUpdateInput) => {
      const { data } = await apiClient.put<ProjectResponse>(
        `/projects/${projectId}`,
        input,
      );
      return data.project;
    },
    onSuccess: (project: Project) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.setQueryData(queryKeys.project(projectId), project);
    },
  });

  return {
    updateProject: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiClient.delete(`/projects/${projectId}`);
      return projectId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });

  return {
    deleteProject: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
  };
}
