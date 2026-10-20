export const DAST_ROUTE_MAP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export type DastRouteMapMethod = (typeof DAST_ROUTE_MAP_METHODS)[number];

export type DastRouteMapEntry = {
  method: DastRouteMapMethod;
  path: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
};

export const DAST_ROUTE_MAP_LIMIT = 200;

export const DAST_ROUTE_MAP_TEMPLATE = `[
  {
    "method": "GET",
    "path": "/api/v1/user"
  },
  {
    "method": "GET",
    "path": "/api/v1/product"
  },
  {
    "method": "POST",
    "path": "/api/v1/product",
    "body": {
      "name": "exemplo"
    }
  },
  {
    "method": "GET",
    "path": "/api/v1/product/{id}",
    "query": {
      "id": "1"
    }
  }
]
`;

const methodSet = new Set<string>(DAST_ROUTE_MAP_METHODS);

export function parseDastRouteMap(
  raw: string,
): { routes: DastRouteMapEntry[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "O mapa precisa ser um JSON válido." };
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { error: "Informe uma lista com pelo menos uma rota." };
  }
  if (parsed.length > DAST_ROUTE_MAP_LIMIT) {
    return { error: `O mapa aceita no máximo ${DAST_ROUTE_MAP_LIMIT} rotas.` };
  }

  const routes: DastRouteMapEntry[] = [];
  for (let index = 0; index < parsed.length; index += 1) {
    const entry = parsed[index];
    const label = `Rota ${index + 1}`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { error: `${label} precisa ser um objeto.` };
    }

    const record = entry as Record<string, unknown>;
    const methodRaw =
      typeof record.method === "string" && record.method.trim() !== ""
        ? record.method.trim().toUpperCase()
        : "GET";
    if (!methodSet.has(methodRaw)) {
      return { error: `${label} tem um método inválido.` };
    }

    if (typeof record.path !== "string" || record.path.trim() === "") {
      return { error: `${label} precisa de um path, por exemplo /api/v1/user.` };
    }
    const path = record.path.trim().replaceAll("\\", "/");
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path) || path.startsWith("//")) {
      return {
        error: `${label} deve ser um caminho do alvo, não uma URL completa.`,
      };
    }
    if (path.split("/").some((segment) => segment === "." || segment === "..")) {
      return { error: `${label} não pode conter . ou ..` };
    }

    const query = readQuery(record.query, label);
    if ("error" in query) {
      return query;
    }
    const body = readBody(record.body, label);
    if (body && "error" in body) {
      return body;
    }

    const filled = fillPlaceholders(path, query.query, label);
    if ("error" in filled) {
      return filled;
    }

    const route: DastRouteMapEntry = {
      method: methodRaw as DastRouteMapMethod,
      path: filled.path.startsWith("/") ? filled.path : `/${filled.path}`,
    };
    if (Object.keys(query.query).length > 0) {
      route.query = query.query;
    }
    if (body && "body" in body) {
      route.body = body.body;
    }
    routes.push(route);
  }

  return { routes };
}

function fillPlaceholders(
  path: string,
  query: Record<string, string>,
  label: string,
): { path: string } | { error: string } {
  const remaining = { ...query };
  let error: string | null = null;
  const filled = path.replace(/\{([A-Za-z0-9_.-]+)\}/g, (match, key: string) => {
    const value = remaining[key];
    if (value === undefined || value === "") {
      error = `${label}: informe o valor de {${key}} em query.`;
      return match;
    }
    if (value.includes("..") || value.includes("/") || value.includes("\\")) {
      error = `${label}: o valor de {${key}} é inválido.`;
      return match;
    }
    delete remaining[key];
    return encodeURIComponent(value);
  });
  if (error) {
    return { error };
  }
  if (/[{}]/.test(filled)) {
    return { error: `${label} ainda tem um placeholder sem valor.` };
  }

  for (const key of Object.keys(query)) {
    if (!(key in remaining)) {
      delete query[key];
    }
  }

  return { path: filled };
}

function readQuery(
  value: unknown,
  label: string,
): { query: Record<string, string> } | { error: string } {
  if (value == null) {
    return { query: {} };
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return { error: `${label}: query precisa ser um objeto.` };
  }

  const query: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    const name = key.trim();
    if (name === "") {
      return { error: `${label}: query tem um nome inválido.` };
    }
    if (
      typeof entry !== "string" &&
      typeof entry !== "number" &&
      typeof entry !== "boolean"
    ) {
      return { error: `${label}: valores de query precisam ser texto ou número.` };
    }
    query[name] = String(entry);
  }

  return { query };
}

function readBody(
  value: unknown,
  label: string,
): { body: Record<string, unknown> } | { error: string } | null {
  if (value == null) {
    return null;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return { error: `${label}: body precisa ser um objeto JSON.` };
  }
  if (Object.keys(value).length === 0) {
    return null;
  }

  return { body: value as Record<string, unknown> };
}
