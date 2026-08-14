"use client";

import { useState } from "react";
import { resolveCoverSrc } from "@/lib/cover-image";
import { cn } from "@/lib/utils";

interface CoverImageProps {
  coverPath?: string | null;
  alt: string;
  className?: string;
  heightClass?: string;
}

/** Exibe capa quando cover_path existe e a URL carrega. */
export function CoverImage({
  coverPath,
  alt,
  className,
  heightClass = "h-36",
}: CoverImageProps) {
  const src = resolveCoverSrc(coverPath);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return null;
  }

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-t-app bg-surface-muted",
        heightClass,
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
