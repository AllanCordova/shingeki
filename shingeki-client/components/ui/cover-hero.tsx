"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { resolveCoverSrc } from "@/lib/cover-image";
import { cn } from "@/lib/utils";

interface CoverHeroProps {
  coverPath?: string | null;
  alt: string;
  children: ReactNode;
  className?: string;
}

/**
 * Capa em largura total (hero) para paginas de detalhe.
 * Quebra o max-width do <main> com o truque viewport center.
 */
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
        "relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 -mt-8",
        className,
      )}
    >
      <div
        className={cn(
          "relative min-h-[12rem] sm:min-h-[14rem] md:min-h-[16rem]",
          hasImage ? "bg-surface-muted" : "border-b border-border bg-surface-muted/40",
        )}
      >
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src!}
              alt={alt}
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
              onError={() => setFailed(true)}
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/20"
              aria-hidden
            />
          </>
        ) : null}

        <div className="relative z-10 mx-auto flex h-full min-h-[inherit] w-full max-w-5xl flex-col justify-end px-4 pb-6 pt-8">
          {children}
        </div>
      </div>
    </section>
  );
}
