import type { QueryClient } from "@tanstack/react-query";
import type { User } from "@/lib/contracts";
import { getApolloClient } from "@/lib/graphql/apollo-client";
import { GUIDED_SETUP_SESSION_KEY } from "@/lib/onboarding";
import { queryKeys } from "@/lib/query-keys";

export function resetClientAuthCache(
  queryClient: QueryClient,
  user?: User | null,
) {
  queryClient.clear();
  void getApolloClient().clearStore();

  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(GUIDED_SETUP_SESSION_KEY);
  }

  if (user) {
    queryClient.setQueryData(queryKeys.me, user);
  }
}
