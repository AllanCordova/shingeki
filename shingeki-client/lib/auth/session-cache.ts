import type { QueryClient } from "@tanstack/react-query";
import type { User } from "@/lib/contracts";
import { queryKeys } from "@/lib/query-keys";

const GUIDED_SETUP_SESSION_KEY = "shingeki_guided_setup_v1";

/** Limpa cache de sessao ao trocar de usuario (login, registro, logout). */
export function resetClientAuthCache(
  queryClient: QueryClient,
  user?: User | null,
) {
  queryClient.clear();

  // Só a sessão ativa do guia (sessionStorage). O "já fechei" fica em localStorage.
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(GUIDED_SETUP_SESSION_KEY);
  }

  if (user) {
    queryClient.setQueryData(queryKeys.me, user);
  }
}
