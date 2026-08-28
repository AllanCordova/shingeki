"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { resolveCoverSrc } from "@/lib/cover/cover-image";
import { cn } from "@/lib/utils";

interface CoverHeroProps {
  coverPath?: string | null;
  alt: string;
  children: ReactNode;
  className?: string;
}

export function CoverHero({
  coverPath,
  alt,
  children,
  className,
}: CoverHeroProps) {
  const src = resolveCoverSrc(coverPath);
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(src && !failed);

  return (
    <section
      className={cn(
        "relative -mt-8",
        "left-1/2 w-screen max-w-[100vw] -translate-x-1/2",
        "md:left-auto md:w-full md:max-w-none md:translate-x-0 md:overflow-hidden md:rounded-lg",
        className,
      )}
    >
      <div
        className={cn(
          "relative min-h-[15rem] md:min-h-[30rem]",
          hasImage ? "bg-surface-muted" : "border-b border-border bg-surface-muted/40 md:border md:border-border",
        )}
      >
        {hasImage ? (
          <>
            {/* Dynamic cover URL; next/image needs a fixed remote allowlist. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src!}
              alt={alt}
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
              onError={() => setFailed(true)}
            />
            <div
              className={cn(
                "absolute inset-0",
                "bg-gradient-to-t from-background from-35% to-transparent to-75%",
                "dark:from-background dark:via-background/80 dark:to-background/25",
              )}
              aria-hidden
            />
          </>
        ) : null}

        <div className="relative z-10 flex h-full min-h-[inherit] w-full flex-col justify-end px-4 pb-6 pt-8 md:px-6">
          {children}
        </div>
      </div>
    </section>
  );
}
