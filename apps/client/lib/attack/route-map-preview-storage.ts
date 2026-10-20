import type { DastRouteMapEntry } from "@/lib/contracts/attack/route-map";

const STORAGE_PREFIX = "shingeki.dast-route-preview:";

export type StoredRouteMapPreview = {
  routes: DastRouteMapEntry[];
  selected: boolean[];
};

export function routeMapPreviewStorageKey(userId: string, systemId: string): string {
  return `${STORAGE_PREFIX}${userId}:${systemId}`;
}

export function readRouteMapPreview(key: string): StoredRouteMapPreview | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRouteMapPreview;
    if (!Array.isArray(parsed.routes) || parsed.routes.length === 0) return null;
    const selected = parsed.routes.map((_, index) => parsed.selected?.[index] !== false);
    return { routes: parsed.routes, selected };
  } catch {
    return null;
  }
}

export function writeRouteMapPreview(key: string, preview: StoredRouteMapPreview): void {
  if (typeof window === "undefined") return;
  try {
    if (preview.routes.length === 0) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(preview));
  } catch {
    // The preview stays in memory when the browser refuses to store it.
  }
}

export function clearRouteMapPreview(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

const ROLE_SEGMENTS = {
  login: ["login", "signin", "sign-in", "session"],
  register: ["register", "signup", "sign-up", "cadastro"],
} as const;

export type RouteMapRole = keyof typeof ROLE_SEGMENTS;

export function routeMapRole(path: string): RouteMapRole | null {
  const segments = path
    .toLowerCase()
    .split(/[/?#]/)
    .filter(Boolean);
  for (const role of Object.keys(ROLE_SEGMENTS) as RouteMapRole[]) {
    const names = ROLE_SEGMENTS[role];
    const found = segments.some((segment) =>
      names.some((name) => segment === name || segment.startsWith(`${name}.`)),
    );
    if (found) return role;
  }
  return null;
}

export function routesByRole(
  routes: DastRouteMapEntry[],
  role: RouteMapRole,
): DastRouteMapEntry[] {
  return routes.filter((route) => routeMapRole(route.path) === role);
}

export function absoluteRouteUrl(targetUrl: string, path: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return path;
  const base = new URL(targetUrl);
  const relative = path.startsWith("/") ? path : `/${path}`;
  return new URL(relative, `${base.protocol}//${base.host}`).toString();
}

export function routeMatchesFilter(route: DastRouteMapEntry, filter: string): boolean {
  const terms = filter.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = `${route.method} ${route.path}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}
