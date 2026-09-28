const INTERNAL_HOSTS = new Set([
  "0.0.0.0",
  "127.0.0.1",
  "localhost",
  "::1",
  "client",
]);

function firstHeader(headers: Headers, name: string): string | null {
  const value = headers.get(name);
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

function hostnameOf(host: string): string {
  const trimmed = host.trim().replace(/^\[|\]$/g, "");
  if (trimmed.startsWith("[")) {
    return trimmed.slice(1, trimmed.indexOf("]")).toLowerCase();
  }
  return trimmed.split(":")[0]?.toLowerCase() ?? "";
}

function isInternalHost(host: string): boolean {
  return INTERNAL_HOSTS.has(hostnameOf(host));
}

/**
 * Origin the browser can open. Next binds HOSTNAME=0.0.0.0, so request.url
 * inside the container is not the public site.
 */
export function publicOrigin(request: {
  url: string;
  headers: Headers;
}): string {
  const configured = process.env.PUBLIC_URL?.trim().replace(/\/$/, "");
  if (configured) {
    try {
      const host = new URL(configured).host;
      if (!isInternalHost(host)) return configured;
    } catch {
      // Ignore a malformed PUBLIC_URL and fall through.
    }
  }

  const host =
    firstHeader(request.headers, "x-forwarded-host") ??
    firstHeader(request.headers, "host");
  if (host && !isInternalHost(host)) {
    const proto =
      firstHeader(request.headers, "x-forwarded-proto") ??
      (request.url.startsWith("https:") ? "https" : "http");
    return `${proto}://${host}`;
  }

  return new URL(request.url).origin;
}
