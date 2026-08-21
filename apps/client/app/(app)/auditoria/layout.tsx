import type { ReactNode } from "react";
import { RequireRole } from "@/components/auth/require-role";

export default function AuditoriaLayout({ children }: { children: ReactNode }) {
  return <RequireRole>{children}</RequireRole>;
}
