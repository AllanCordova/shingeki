import "server-only";

/** Secure cookies when the browser talks HTTPS. COOKIE_SECURE overrides NODE_ENV. */
export function authCookieSecure(): boolean {
  const raw = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return process.env.NODE_ENV === "production";
}
