import { useEffect, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import Toast from "react-native-toast-message";

function useReactQueryAppFocus() {
  useEffect(() => {
    if (Platform.OS === "web") return;

    const subscription = AppState.addEventListener("change", (status) => {
      focusManager.setFocused(status === "active");
    });

    return () => subscription.remove();
  }, []);
}

export function AppProviders({ children }: { children: ReactNode }) {
  useReactQueryAppFocus();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
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
      <Toast />
    </QueryClientProvider>
  );
}
