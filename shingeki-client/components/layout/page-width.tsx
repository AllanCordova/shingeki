"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Paginas de logs de disparo usam toda a largura da area principal (ao lado da sidebar). */
function isWideResultsPage(pathname: string): boolean {
  return /\/sistemas\/[^/]+\/resultados\/[^/]+$/.test(pathname);
}

export function PageWidth({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isWideResultsPage(pathname)) {
    return children;
  }

  return <div className={cn("mx-auto w-full max-w-5xl")}>{children}</div>;
}
