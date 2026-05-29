"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppToaster } from "@/components/providers/app-toaster";

/**
 * Providers globais do app (client component).
 * - React Query: gerencia todo dado vindo da API.
 *   staleTime padrao moderado (baixa volatilidade); hooks de alta volatilidade
 *   sobrescrevem com staleTime 0 + refetchInterval.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 min — dados de baixa volatilidade
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <AppToaster />
    </QueryClientProvider>
  );
}
