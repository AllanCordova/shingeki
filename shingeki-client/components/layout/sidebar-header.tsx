"use client";

import { useMe } from "@/lib/hooks/use-auth";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";
import { PanelLeftCloseIcon } from "@/components/ui/icons";

export function SidebarHeader() {
  const { user } = useMe();
  const collapsed = useUiStore((state) => state.adminSidebarCollapsed);
  const toggleAdminSidebar = useUiStore((state) => state.toggleAdminSidebar);

  return (
    <div
      className={cn(
        "flex items-center border-b border-border",
        collapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-4",
      )}
    >
      {!collapsed && user ? (
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold text-foreground"
            title={user.name}
          >
            {user.name}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={toggleAdminSidebar}
        aria-label={collapsed ? "Expandir painel" : "Recolher painel"}
        title={collapsed ? "Expandir painel" : "Recolher painel"}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-app border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted",
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
