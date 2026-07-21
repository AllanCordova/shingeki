import type { ReactNode } from "react";
import { RequireRole } from "@/components/auth/require-role";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RequireRole roles={["ADMIN"]}>{children}</RequireRole>;
}
