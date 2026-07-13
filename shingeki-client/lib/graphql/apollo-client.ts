"use client";

import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

let browserClient: ApolloClient | null = null;

export function getApolloClient(): ApolloClient {
  if (browserClient) {
    return browserClient;
  }

  browserClient = new ApolloClient({
    link: new HttpLink({
      uri: "/api/graphql",
      credentials: "include",
    }),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-first",
      },
      query: {
        fetchPolicy: "cache-first",
      },
    },
  });

  return browserClient;
}
