"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import type {
  GitHubRemediationPrPreviewResponse,
  OpenGitHubRemediationPrInput,
  OpenGitHubRemediationPrResponse,
  RemediateSystemAiInput,
  RemediateSystemAiResponse,
  RemediateSystemInput,
  RemediateSystemResponse,
} from "@/lib/contracts";

export function useRemediateSystem(projectId: string, systemId: string) {
  const mutation = useMutation({
    mutationFn: async (input: RemediateSystemInput = {}) => {
      const { data } = await apiClient.post<RemediateSystemResponse>(
        `/projects/${projectId}/systems/${systemId}/remediate`,
        input,
      );
      return data;
    },
  });

  return {
    remediate: mutation.mutateAsync,
    data: mutation.data,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function useAiRemediateSystem(projectId: string, systemId: string) {
  const mutation = useMutation({
    mutationFn: async (input: RemediateSystemAiInput = {}) => {
      const { data } = await apiClient.post<RemediateSystemAiResponse>(
        `/projects/${projectId}/systems/${systemId}/remediate/ai`,
        input,
      );
      return data;
    },
  });

  return {
    remediateWithAi: mutation.mutateAsync,
    data: mutation.data,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function useGitHubRemediationPr(projectId: string, systemId: string) {
  const mutation = useMutation({
    mutationFn: async (input: OpenGitHubRemediationPrInput) => {
      const { data } = await apiClient.post<OpenGitHubRemediationPrResponse>(
        `/projects/${projectId}/systems/${systemId}/remediate/github-pr`,
        input,
      );
      return data;
    },
  });

  return {
    openPullRequest: mutation.mutateAsync,
    data: mutation.data,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function useGitHubRemediationPrPreview(projectId: string, systemId: string) {
  const mutation = useMutation({
    mutationFn: async (input: OpenGitHubRemediationPrInput) => {
      const { data } = await apiClient.post<GitHubRemediationPrPreviewResponse>(
        `/projects/${projectId}/systems/${systemId}/remediate/github-pr/preview`,
        input,
      );
      return data;
    },
  });

  return {
    previewPullRequest: mutation.mutateAsync,
    data: mutation.data,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}
