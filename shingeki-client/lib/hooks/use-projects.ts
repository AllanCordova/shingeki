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
  User,
} from "@/lib/contracts";
import {
  buildProjectCreateFormData,
  buildProjectUpdateFormData,
} from "@/lib/multipart";
import { useMe } from "@/lib/hooks/use-auth";

function projectsKey(userId?: string) {
  return queryKeys.projects(userId ?? "");
}

function sidebarKey(userId?: string) {
  return queryKeys.sidebarNavigation(userId ?? "");
}

/** Lista de projetos (baixa volatilidade). */
export function useProjects() {
  const { user } = useMe();
  const userId = user?.id;

  const query = useQuery({
    queryKey: projectsKey(userId),
    queryFn: async () => {
      const { data } = await apiClient.get<ProjectsResponse>("/projects");
      return data.projects;
    },
    enabled: Boolean(userId),
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
        buildProjectCreateFormData(input),
      );
      return data.project;
    },
    onSuccess: () => {
      const user = queryClient.getQueryData<User>(queryKeys.me);
      if (!user?.id) return;

      queryClient.invalidateQueries({ queryKey: projectsKey(user.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.coverUploads });
      queryClient.invalidateQueries({ queryKey: sidebarKey(user.id) });
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
      const formData = buildProjectUpdateFormData(input);

      const { data } = formData
        ? await apiClient.put<ProjectResponse>(
            `/projects/${projectId}`,
            formData,
          )
        : await apiClient.put<ProjectResponse>(`/projects/${projectId}`, input);

      return data.project;
    },
    onSuccess: (project: Project) => {
      const user = queryClient.getQueryData<User>(queryKeys.me);
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: projectsKey(user.id) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.coverUploads });
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
      const user = queryClient.getQueryData<User>(queryKeys.me);
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: projectsKey(user.id) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.coverUploads });
    },
  });

  return {
    deleteProject: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
  };
}
