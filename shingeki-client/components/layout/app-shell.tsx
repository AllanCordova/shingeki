"use client";

import type { ReactNode } from "react";
import { canManageCatalog, isCommonUser } from "@/lib/auth/roles";
import { useMe } from "@/lib/hooks/auth/use-auth";
import { Header } from "@/components/layout/header";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { ProjectsSidebarNav } from "@/components/layout/projects-sidebar-nav";
import { SidebarHeader } from "@/components/layout/sidebar-header";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";
import { GuidedSetupFlow } from "@/components/onboarding/guided-setup-flow";

function ProjectsOnlySidebar() {
  const collapsed = useUiStore((state) => state.adminSidebarCollapsed);

  return (
    <aside
      className={cn(
        "sticky top-16 flex h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <SidebarHeader />

      <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
        <ProjectsSidebarNav collapsed={collapsed} />
      </nav>
    </aside>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isLoading: userLoading } = useMe();
  const showAdminSidebar = Boolean(user) && canManageCatalog(user);
  const showProjectsSidebar = Boolean(user) && isCommonUser(user);
  const showSidebar = !userLoading && (showAdminSidebar || showProjectsSidebar);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        {userLoading ? (
          <aside
            className={cn(
              "sticky top-16 h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-border bg-surface",
            )}
            aria-hidden
          />
        ) : showAdminSidebar ? (
          <AdminSidebar />
        ) : showProjectsSidebar ? (
          <ProjectsOnlySidebar />
        ) : null}
        <main className="min-w-0 flex-1 px-4 py-8 lg:px-6">
          {children}
        </main>
      </div>
      {showSidebar ? <GuidedSetupFlow /> : null}
    </div>
  );
}
