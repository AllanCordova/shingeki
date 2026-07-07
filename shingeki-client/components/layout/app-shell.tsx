"use client";

import type { ReactNode } from "react";
import { canManageCatalog } from "@/lib/auth/roles";
import { useMe } from "@/lib/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useMe();
  const showAdminSidebar = canManageCatalog(user);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        {showAdminSidebar ? <AdminSidebar /> : null}
        <main className="min-w-0 flex-1 px-4 py-8 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
