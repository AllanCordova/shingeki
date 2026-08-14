import type { QueryClient } from "@tanstack/react-query";
import type { User } from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";
import { discardGuidedSetupSession } from "@/lib/onboarding/guided-setup";

/** Limpa cache de sessao ao trocar de usuario (login, registro, logout). */
export function resetClientAuthCache(
  queryClient: QueryClient,
  user?: User | null,
) {
  queryClient.clear();
  discardGuidedSetupSession();

  if (user) {
    queryClient.setQueryData(queryKeys.me, user);
  }
}
