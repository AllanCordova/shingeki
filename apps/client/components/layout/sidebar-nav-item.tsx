"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export function SidebarNavItem({
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
