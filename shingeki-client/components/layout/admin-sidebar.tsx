"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/stores/ui-store";
import { Button } from "@/components/ui/button";
import {
  LayoutGridIcon,
  PanelLeftCloseIcon,
  ShieldAlertIcon,
  PillIcon,
  FolderIcon,
} from "@/components/ui/icons";

const navItems = [
  {
    href: "/admin",
    label: "Visao geral",
    exact: true,
    Icon: LayoutGridIcon,
  },
  {
    href: "/admin/ataques",
    label: "Ataques",
    exact: false,
    Icon: ShieldAlertIcon,
  },
  {
    href: "/admin/medicacoes",
    label: "Medicacoes",
    exact: false,
    Icon: PillIcon,
  },
  {
    href: "/projetos",
    label: "Projetos",
    exact: false,
    Icon: FolderIcon,
  },
] as const;

function NavItem({
  href,
  label,
  Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={cn(
        "flex items-center rounded-app text-sm transition-colors",
        collapsed ? "h-10 justify-center px-0" : "gap-3 px-3 py-2",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const collapsed = useUiStore((state) => state.adminSidebarCollapsed);
  const toggleAdminSidebar = useUiStore((state) => state.toggleAdminSidebar);

  return (
    <aside
      className={cn(
        "sticky top-16 flex h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex items-center border-b border-border",
          collapsed ? "justify-center px-2 py-3" : "justify-between gap-3 px-4 py-4",
        )}
      >
        {!collapsed ? (
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Admin
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Catalogo global
            </p>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("shrink-0", collapsed && "h-9 w-9 p-0")}
          onClick={toggleAdminSidebar}
          aria-label={collapsed ? "Expandir painel admin" : "Recolher painel admin"}
          title={collapsed ? "Expandir painel" : "Recolher painel"}
        >
          <PanelLeftCloseIcon
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
          />
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 py-3">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.Icon}
              active={active}
              collapsed={collapsed}
            />
          );
        })}
      </nav>
    </aside>
  );
}
