"use client";

import type { ReactNode } from "react";
import { canManageCatalog, isCommonUser } from "@/lib/auth/roles";
import { useMe } from "@/lib/hooks/use-auth";
import { useUiStore } from "@/lib/stores/ui-store";
import { Header } from "@/components/layout/header";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { ProjectsSidebarNav } from "@/components/layout/projects-sidebar-nav";
import { SidebarHeader } from "@/components/layout/sidebar-header";
import { AppSidebarFrame } from "@/components/layout/app-sidebar-frame";
import { GuidedSetupFlow } from "@/components/onboarding/guided-setup-flow";

function ProjectsOnlySidebar() {
  const collapsed = useUiStore((state) => state.adminSidebarCollapsed);

  return (
    <AppSidebarFrame>
      <SidebarHeader />
      <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
        <ProjectsSidebarNav collapsed={collapsed} />
      </nav>
    </AppSidebarFrame>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isLoading: userLoading } = useMe();
  const showAdminSidebar = Boolean(user) && canManageCatalog(user);
  const showProjectsSidebar = Boolean(user) && isCommonUser(user);
  const showSidebar = !userLoading && (showAdminSidebar || showProjectsSidebar);

  return (
    <div className="min-h-screen bg-background">
      <Header showMenuButton={showSidebar} />
      <div className="flex">
        {userLoading ? null : showAdminSidebar ? (
          <AdminSidebar />
        ) : showProjectsSidebar ? (
          <ProjectsOnlySidebar />
        ) : null}
        <main className="min-w-0 flex-1 px-3 py-5 sm:px-4 sm:py-8 lg:px-6">{children}</main>
      </div>
      {showSidebar ? <GuidedSetupFlow /> : null}
    </div>
  );
}
