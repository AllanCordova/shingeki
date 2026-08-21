"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { isAdmin } from "@/lib/auth/roles";
import { useMe } from "@/lib/hooks/auth/use-auth";
import { useUiStore } from "@/lib/stores/ui-store";
import {
  ClipboardListIcon,
  ShieldIcon,
} from "@/components/ui/icons";
import { ProjectsSidebarNav } from "@/components/layout/projects-sidebar-nav";
import { SidebarHeader } from "@/components/layout/sidebar-header";
import { AppSidebarFrame } from "@/components/layout/app-sidebar-frame";

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
        collapsed
          ? "h-10 justify-center px-0 max-lg:gap-3 max-lg:justify-start max-lg:px-3 max-lg:py-2"
          : "gap-3 px-3 py-2",
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
  const { user } = useMe();
  const showAdminNav = isAdmin(user);

  const auditoriaActive =
    pathname === "/auditoria" || pathname.startsWith("/auditoria/");
  const adminActive = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <AppSidebarFrame>
      <SidebarHeader />

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
        <NavItem
          href="/auditoria"
          label="Auditoria"
          Icon={ClipboardListIcon}
          active={auditoriaActive}
          collapsed={collapsed}
        />

        {showAdminNav ? (
          <NavItem
            href="/admin"
            label="Admin"
            Icon={ShieldIcon}
            active={adminActive}
            collapsed={collapsed}
          />
        ) : null}

        <div
          className={cn(
            "mt-2 border-t border-border pt-2",
            collapsed && "mt-1 pt-1",
          )}
        >
          <ProjectsSidebarNav collapsed={collapsed} />
        </div>
      </nav>
    </AppSidebarFrame>
  );
}
