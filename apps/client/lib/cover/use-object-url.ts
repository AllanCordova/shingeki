"use client";

import { useEffect, useState } from "react";

/**
 * Object URLs must be created and revoked in the same effect.
 * Creating them in useMemo and revoking in an effect cleanup lets React
 * Strict Mode revoke the URL while the memo still returns it — the <img>
 * then requests a dead blob: URL (common on Safari / iOS).
 */
export function useObjectUrl(source: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!source) {
      setUrl(null);
      return;
    }

    const blob = source.slice(0, source.size, source.type || "image/jpeg");
    const nextUrl = URL.createObjectURL(blob);
    setUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [source]);

  return url;
}
