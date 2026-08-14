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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
            className="mt-2 inline-block text-sm text-muted-foreground underline hover:text-foreground sm:text-base"
          >
            {system.target_url}
          </a>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </CoverHero>
  );
}
