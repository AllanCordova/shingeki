const INTERNAL_FALLBACK = "/projetos";

function looksLikeScheme(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
}

function decodedIsUnsafe(value: string): boolean {
  try {
    const decoded = decodeURIComponent(value);
    return (
      /^\/{2,}/.test(decoded) ||
      decoded.includes("\\") ||
      /[\r\n]/.test(decoded) ||
      looksLikeScheme(decoded)
    );
  } catch {
    return true;
  }
}

/** Path relativo da propria app. Rejeita //host, esquemas e backslash. */
export function safeInternalPath(
  value: string | null | undefined,
  fallback = INTERNAL_FALLBACK,
): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || /[\r\n]/.test(value) || looksLikeScheme(value)) {
    return fallback;
  }
  if (decodedIsUnsafe(value)) return fallback;
  return value;
}

/** http/https absoluto. Qualquer outro esquema retorna null. */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Path interno ou URL http(s). Usado em links mistos (notificacoes). */
export function safeHref(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("/")) {
    const path = safeInternalPath(trimmed, "");
    return path || null;
  }
  return safeExternalUrl(trimmed);
}
