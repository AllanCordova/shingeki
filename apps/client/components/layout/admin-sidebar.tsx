"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isAdmin } from "@/lib/auth/roles";
import { useMe } from "@/lib/hooks/auth/use-auth";
import { useUiStore } from "@/lib/stores/ui-store";
import {
  ClipboardListIcon,
  HomeIcon,
  ShieldIcon,
} from "@/components/ui/icons";
import { ProjectsSidebarNav } from "@/components/layout/projects-sidebar-nav";
import { SidebarHeader } from "@/components/layout/sidebar-header";
import { AppSidebarFrame } from "@/components/layout/app-sidebar-frame";
import { SidebarNavItem } from "@/components/layout/sidebar-nav-item";

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
        <SidebarNavItem
          href="/"
          label="Início"
          Icon={HomeIcon}
          active={pathname === "/"}
          collapsed={collapsed}
        />

        <SidebarNavItem
          href="/auditoria"
          label="Auditoria"
          Icon={ClipboardListIcon}
          active={auditoriaActive}
          collapsed={collapsed}
        />

        {showAdminNav ? (
          <SidebarNavItem
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
