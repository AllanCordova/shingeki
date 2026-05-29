/**
 * Resolve cover_path da API para URL exibivel no <img>.
 *
 * - URL https://...  -> usada direto (Pexels: precisa ser images.pexels.com, nao a pagina)
 * - /storage/...     -> prefixada com NEXT_PUBLIC_MEDIA_BASE_URL (API Laravel)
 */
export function resolveCoverSrc(
  coverPath: string | null | undefined,
): string | null {
  if (!coverPath?.trim()) return null;

  const path = coverPath.trim();

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const base = getMediaBaseUrl();
  if (path.startsWith("/") && base) {
    return `${base}${path}`;
  }

  if (path.startsWith("/")) {
    return path;
  }

  return null;
}

function getMediaBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  // Fallback de desenvolvimento quando .env.local nao define MEDIA_BASE_URL
  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8000";
  }

  return "";
}
