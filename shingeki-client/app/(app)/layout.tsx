import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageWidth } from "@/components/layout/page-width";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <PageWidth>{children}</PageWidth>
    </AppShell>
  );
}
