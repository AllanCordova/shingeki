const MEDIA_BASE_URL =
  process.env.EXPO_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000";

export function resolveCoverSrc(
  coverPath: string | null | undefined,
): string | null {
  if (!coverPath?.trim()) return null;

  const path = coverPath.trim();

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${MEDIA_BASE_URL}${path}`;
  }

  return null;
}
