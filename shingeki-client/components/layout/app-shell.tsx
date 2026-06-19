"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { canManageCatalog } from "@/lib/auth/roles";
import { useMe } from "@/lib/hooks/use-auth";
import { Header } from "@/components/layout/header";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useMe();
  const showAdminSidebar = canManageCatalog(user);
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        {showAdminSidebar ? <AdminSidebar /> : null}
        <main
          className={cn(
            "min-w-0 flex-1",
            isAdminRoute ? "px-6 py-8 lg:px-10" : "mx-auto max-w-5xl px-4 py-8",
          )}
        >
          {isAdminRoute ? (
            <div className="mx-auto max-w-5xl">{children}</div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
