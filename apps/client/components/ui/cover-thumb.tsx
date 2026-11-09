"use client";

import { useState } from "react";
import { resolveCoverSrc } from "@/lib/cover/cover-image";
import { cn } from "@/lib/utils";

const sizes = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
} as const;

export type CoverThumbSize = keyof typeof sizes;

interface CoverThumbProps {
  coverPath?: string | null;
  alt?: string;
  size?: CoverThumbSize;
  className?: string;
}

export function CoverThumb({
  coverPath,
  alt = "",
  size = "sm",
  className,
}: CoverThumbProps) {
  const src = resolveCoverSrc(coverPath);
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted",
        sizes[size],
        className,
      )}
    >
      {/* Cover URLs are dynamic; next/image needs a fixed remote allowlist. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
