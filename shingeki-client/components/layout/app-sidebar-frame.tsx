"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

/**
 * Desktop: sticky column with collapse width.
 * Mobile: off-canvas drawer controlled by mobileMenuOpen.
 */
export function AppSidebarFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const collapsed = useUiStore((state) => state.adminSidebarCollapsed);
  const mobileOpen = useUiStore((state) => state.mobileMenuOpen);
  const setMobileMenu = useUiStore((state) => state.setMobileMenu);

  useEffect(() => {
    setMobileMenu(false);
  }, [pathname, setMobileMenu]);

  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenu(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, setMobileMenu]);

  return (
    <>
      <div
        aria-hidden={!mobileOpen}
        className={cn(
          "fixed inset-x-0 top-16 bottom-0 z-40 bg-foreground/20 transition-opacity duration-200 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileMenu(false)}
      />
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-surface",
          "fixed top-16 bottom-0 left-0 z-50 w-64 max-w-[85vw] transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:z-auto lg:h-[calc(100vh-4rem)] lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:transition-[width]",
          collapsed ? "lg:w-16" : "lg:w-64",
        )}
      >
        {children}
      </aside>
    </>
  );
}
