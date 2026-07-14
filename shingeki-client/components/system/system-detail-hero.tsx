"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CoverHero } from "@/components/ui";

interface SystemDetailHeroProps {
  system: {
    name: string;
    target_url: string;
    cover_path?: string | null;
  };
  backHref: string;
  backLabel: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function SystemDetailHero({
  system,
  backHref,
  backLabel,
  subtitle,
  actions,
}: SystemDetailHeroProps) {
  return (
    <CoverHero coverPath={system.cover_path} alt={`Capa de ${system.name}`}>
      <Link
        href={backHref}
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        {backLabel}
      </Link>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          {subtitle ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {subtitle}
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {system.name}
          </h1>
          <a
            href={system.target_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block truncate text-sm text-muted-foreground underline hover:text-foreground sm:text-base"
            title={system.target_url}
          >
            {system.target_url}
          </a>
        </div>
        {actions ? (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">
            {actions}
          </div>
        ) : null}
      </div>
    </CoverHero>
  );
}
