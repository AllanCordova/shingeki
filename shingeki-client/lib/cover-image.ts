/**
 * Resolve cover_path da API para URL exibivel no <img>.
 *
 * Paths `/storage/...` sao prefixados com NEXT_PUBLIC_MEDIA_BASE_URL (API Laravel).
 */
export function resolveCoverSrc(
  coverPath: string | null | undefined,
): string | null {
  if (!coverPath?.trim()) return null;

  const path = coverPath.trim();

  if (path.startsWith("/")) {
    const base = getMediaBaseUrl();
    return base ? `${base}${path}` : path;
  }

  return null;
}

function getMediaBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8000";
  }

  return "";
}
