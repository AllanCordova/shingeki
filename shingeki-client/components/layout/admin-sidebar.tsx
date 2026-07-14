"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/stores/ui-store";
import {
  LayoutGridIcon,
  ShieldAlertIcon,
  PillIcon,
} from "@/components/ui/icons";
import { ProjectsSidebarNav } from "@/components/layout/projects-sidebar-nav";
import { SidebarHeader } from "@/components/layout/sidebar-header";
import { AppSidebarFrame } from "@/components/layout/app-sidebar-frame";

const adminNavItems = [
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
        collapsed ? "h-10 justify-center px-0 max-lg:gap-3 max-lg:px-3 max-lg:py-2 max-lg:justify-start" : "gap-3 px-3 py-2",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className={cn("truncate", collapsed && "lg:hidden")}>{label}</span>
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const collapsed = useUiStore((state) => state.adminSidebarCollapsed);

  return (
    <AppSidebarFrame>
      <SidebarHeader />

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
        {adminNavItems.map((item) => {
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

        <div className={cn("mt-2 border-t border-border pt-2", collapsed && "mt-1 pt-1")}>
          <ProjectsSidebarNav collapsed={collapsed} />
        </div>
      </nav>
    </AppSidebarFrame>
  );
}
