"use client";

import { useState, type ReactNode } from "react";
import { ApolloProvider } from "@apollo/client/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppToaster } from "@/components/providers/app-toaster";
import { getApolloClient } from "@/lib/graphql/apollo-client";

/**
 * Providers globais do app.
 * React Query cobre REST; Apollo cobre GraphQL (sidebar navigation).
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
  const [apolloClient] = useState(() => getApolloClient());

  return (
    <ApolloProvider client={apolloClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <AppToaster />
      </QueryClientProvider>
    </ApolloProvider>
  );
}
