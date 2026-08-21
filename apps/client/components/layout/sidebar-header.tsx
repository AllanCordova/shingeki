"use client";

import { useMe } from "@/lib/hooks/auth/use-auth";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";
import { PanelLeftCloseIcon, XIcon } from "@/components/ui/icons";

export function SidebarHeader() {
  const { user } = useMe();
  const collapsed = useUiStore((state) => state.adminSidebarCollapsed);
  const toggleAdminSidebar = useUiStore((state) => state.toggleAdminSidebar);
  const setMobileMenu = useUiStore((state) => state.setMobileMenu);

  return (
    <div
      className={cn(
        "flex items-center border-b border-border",
        collapsed ? "justify-center px-2 py-3 lg:justify-center" : "gap-3 px-4 py-4",
        "max-lg:justify-between max-lg:px-4 max-lg:py-4",
      )}
    >
      <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
        {user ? (
          <p
            className="truncate text-sm font-semibold text-foreground"
            title={user.name}
          >
            {user.name}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setMobileMenu(false)}
        aria-label="Fechar menu"
        title="Fechar menu"
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-app border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted lg:hidden",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <XIcon className="h-4 w-4 shrink-0" />
      </button>

      <button
        type="button"
        onClick={toggleAdminSidebar}
        aria-label={collapsed ? "Expandir painel" : "Recolher painel"}
        title={collapsed ? "Expandir painel" : "Recolher painel"}
        className={cn(
          "hidden shrink-0 items-center justify-center rounded-app border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted lg:inline-flex",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          collapsed ? "h-10 w-10" : "h-9 w-9",
        )}
      >
        <PanelLeftCloseIcon
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            collapsed && "rotate-180",
          )}
        />
      </button>
    </div>
  );
}
