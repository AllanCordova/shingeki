"use client";

import { Toaster } from "sonner";
import { useThemeStore } from "@/lib/stores/theme-store";

export function AppToaster() {
  const theme = useThemeStore((state) => state.theme);

  return (
    <Toaster
      position="bottom-right"
      theme={theme}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "border border-border bg-surface text-foreground shadow-lg",
        },
      }}
    />
  );
}
