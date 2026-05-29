"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/error-handler";
import { queryKeys } from "@/lib/query-keys";
import type {
  LoginInput,
  MeResponse,
  RegisterInput,
  UpdateProfileInput,
  User,
} from "@/lib/contracts";

async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<MeResponse>("/auth/me");
  return data.user;
}

/** Dados do usuario autenticado (baixa volatilidade — staleTime infinito). */
export function useMe(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchMe,
    enabled,
    staleTime: Infinity,
    retry: false,
  });

  return {
    user: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as ApiError | null) ?? null,
    refetch: query.refetch,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await apiClient.post<{ user: User }>(
        "/auth/login",
        input,
      );
      return data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
    },
  });

  return {
    login: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function useRegister() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await apiClient.post<{ user: User }>(
        "/auth/register",
        input,
      );
      return data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
    },
  });

  return {
    register: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}

export function useLogout() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });

  return {
    logout: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
  };
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { data } = await apiClient.put<MeResponse>("/auth/me", input);
      return data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
    },
  });

  return {
    updateProfile: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: (mutation.error as ApiError | null) ?? null,
    reset: mutation.reset,
  };
}
