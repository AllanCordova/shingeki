const ARM_KEY = "armedCapture";
const ROUTES_KEY = "capturedRoutes";
const AUTH_HEADER_KEY = "capturedAuthorization";
const MAX_ROUTES = 200;
const COOKIE_HEADER_MAX = 16384;

const SKIP_REQUEST_TYPES = new Set([
  "stylesheet",
  "script",
  "image",
  "font",
  "media",
  "ping",
  "csp_report",
]);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void handleMessage(message).then(sendResponse);
  return true;
});

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  void handleMessage(message).then(sendResponse);
  return true;
});

chrome.webRequest.onCompleted.addListener(
  (details) => {
    void recordCompletedRequest(details);
  },
  { urls: ["<all_urls>"] },
);

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    void recordAuthorizationHeader(details);
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders", "extraHeaders"],
);

async function handleMessage(message) {
  if (!message || typeof message !== "object") {
    return { ok: false, error: "Invalid message" };
  }

  switch (message.type) {
    case "shingeki.ping":
      return { ok: true, version: chrome.runtime.getManifest().version };
    case "shingeki.armCapture":
      return armCapture(message);
    case "shingeki.getArmState":
      return getArmState();
    case "shingeki.clearArm":
      await clearArm();
      return { ok: true };
    case "shingeki.captureActiveTab":
      return captureTargetSession();
    default:
      return { ok: false, error: `Unknown type: ${message.type}` };
  }
}

async function armCapture(message) {
  const ticket = String(message.ticket ?? "").trim();
  const apiBase = String(message.apiBase ?? "").trim().replace(/\/$/, "");
  const targetOrigin = String(message.targetOrigin ?? "").trim().replace(/\/$/, "");
  const clientOrigin = String(message.clientOrigin ?? "").trim().replace(/\/$/, "");
  const openUrl = String(message.openUrl ?? message.loginUrl ?? "").trim();
  const systemName = String(message.systemName ?? "").trim();
  const expiresAt = Number(message.expiresAt ?? Date.now() + 15 * 60 * 1000);

  if (!ticket || !apiBase || !targetOrigin) {
    return {
      ok: false,
      error: "ticket, apiBase and targetOrigin are required",
    };
  }

  const payload = {
    ticket,
    apiBase,
    targetOrigin,
    clientOrigin,
    openUrl,
    systemName,
    expiresAt,
    armedAt: Date.now(),
    loginTabId: null,
  };

  await chrome.storage.session.set({
    [ARM_KEY]: payload,
    [ROUTES_KEY]: [],
    [AUTH_HEADER_KEY]: "",
  });

  try {
    await chrome.action.setBadgeText({ text: "ON" });
    await chrome.action.setBadgeBackgroundColor({ color: "#0a0a0a" });
  } catch {
  }

  if (openUrl) {
    void openLoginTab(openUrl);
  }

  return { ok: true, armed: payload, openedTab: Boolean(openUrl) };
}

async function openLoginTab(openUrl) {
  try {
    const tab = await chrome.tabs.create({ url: openUrl, active: true });
    const stored = await chrome.storage.session.get(ARM_KEY);
    const armed = stored[ARM_KEY];
    if (!armed) return;
    armed.loginTabId = tab.id ?? null;
    await chrome.storage.session.set({ [ARM_KEY]: armed });
  } catch (error) {
    console.error("shingeki: failed to open login tab", error);
  }
}

async function getArmState() {
  const stored = await chrome.storage.session.get(ARM_KEY);
  const armed = stored[ARM_KEY] ?? null;
  if (!armed) {
    return { ok: true, armed: null };
  }
  if (armed.expiresAt && Date.now() > armed.expiresAt) {
    await clearArm();
    return { ok: true, armed: null };
  }
  return { ok: true, armed };
}

async function clearArm() {
  await chrome.storage.session.remove([ARM_KEY, ROUTES_KEY, AUTH_HEADER_KEY]);
  try {
    await chrome.action.setBadgeText({ text: "" });
  } catch {
  }
}

function originsMatch(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function apexHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host.startsWith("www.") ? host.slice(4) : host;
}

function sameApex(hostname, originOrHost) {
  try {
    const left = apexHost(hostname);
    const rightHost = originOrHost.includes("://")
      ? new URL(originOrHost).hostname
      : originOrHost;
    const right = apexHost(rightHost);
    return left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`);
  } catch {
    return false;
  }
}

async function resolveTargetTab(armed) {
  if (armed.loginTabId != null) {
    try {
      const tab = await chrome.tabs.get(armed.loginTabId);
      if (tab?.url && !tab.url.startsWith("chrome://")) {
        const origin = new URL(tab.url).origin;
        if (originsMatch(origin, armed.targetOrigin) || sameApex(new URL(tab.url).hostname, armed.targetOrigin)) {
          return tab;
        }
      }
    } catch {
    }
  }

  const matching = await chrome.tabs.query({ url: `${armed.targetOrigin}/*` });
  const usable = matching.find((tab) => tab.url && !tab.url.startsWith("chrome://"));
  if (usable) {
    return usable;
  }

  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active?.url && !active.url.startsWith("chrome://") && !active.url.startsWith("chrome-extension://")) {
    try {
      const origin = new URL(active.url).origin;
      if (originsMatch(origin, armed.targetOrigin) || sameApex(new URL(active.url).hostname, armed.targetOrigin)) {
        return active;
      }
    } catch {
    }
  }

  return null;
}

async function recordCompletedRequest(details) {
  if (!details?.url || SKIP_REQUEST_TYPES.has(details.type)) {
    return;
  }
  const { armed } = await getArmState();
  if (!armed?.targetOrigin) {
    return;
  }
  let hostname;
  try {
    hostname = new URL(details.url).hostname;
  } catch {
    return;
  }
  if (!sameApex(hostname, armed.targetOrigin)) {
    return;
  }

  const stored = await chrome.storage.session.get(ROUTES_KEY);
  const routes = Array.isArray(stored[ROUTES_KEY]) ? stored[ROUTES_KEY] : [];
  const method = String(details.method || "GET").toUpperCase();
  const url = details.url.split("#")[0];
  const key = `${method} ${url}`;
  if (routes.some((route) => `${route.method} ${route.url}` === key)) {
    return;
  }
  routes.push({
    method,
    url,
    type: details.type || "",
  });
  if (routes.length > MAX_ROUTES) {
    routes.splice(0, routes.length - MAX_ROUTES);
  }
  await chrome.storage.session.set({ [ROUTES_KEY]: routes });
}

async function recordAuthorizationHeader(details) {
  if (!details?.url || !Array.isArray(details.requestHeaders)) {
    return;
  }
  const { armed } = await getArmState();
  if (!armed?.targetOrigin) {
    return;
  }
  try {
    if (!sameApex(new URL(details.url).hostname, armed.targetOrigin)) {
      return;
    }
  } catch {
    return;
  }
  const header = details.requestHeaders.find((item) =>
    String(item.name || "").toLowerCase() === "authorization",
  );
  const value = String(header?.value || "").trim();
  if (!value || !/^bearer\s+/i.test(value)) {
    return;
  }
  await chrome.storage.session.set({ [AUTH_HEADER_KEY]: value });
}

async function captureTargetSession() {
  const { armed } = await getArmState();
  if (!armed) {
    return {
      ok: false,
      error:
        "Nenhuma captura armada (ou ja foi concluida). No Shingeki, clique Conectar ao alvo e tente de novo.",
    };
  }

  const tab = await resolveTargetTab(armed);
  if (!tab?.id || !tab.url) {
    return {
      ok: false,
      error: `Nao achei uma aba aberta em ${armed.targetOrigin}. Faca login na aba do alvo e clique Capturar de novo.`,
    };
  }

  let tabOrigin;
  let host;
  try {
    const parsed = new URL(tab.url);
    tabOrigin = parsed.origin;
    host = parsed.hostname;
  } catch {
    return { ok: false, error: "URL da aba do alvo invalida." };
  }

  if (!originsMatch(tabOrigin, armed.targetOrigin) && !sameApex(host, armed.targetOrigin)) {
    return {
      ok: false,
      error: `A aba encontrada e ${tabOrigin}, mas o ticket espera ${armed.targetOrigin}.`,
    };
  }

  const cookies = await collectCookies(tab.url, tabOrigin, host);
  if (!cookies.length) {
    return {
      ok: false,
      error: "Nenhum cookie encontrado no dominio do alvo. Confirme que voce esta logado.",
    };
  }

  const webStorage = await captureWebStorage(tab.id);
  const performanceRoutes = await capturePerformanceRoutes(tab.id);
  const buffered = await chrome.storage.session.get([ROUTES_KEY, AUTH_HEADER_KEY]);
  const routes = mergeRoutes(
    [{ method: "GET", url: tab.url.split("#")[0], type: "main_frame" }],
    Array.isArray(buffered[ROUTES_KEY]) ? buffered[ROUTES_KEY] : [],
    performanceRoutes,
  );
  const userAgent = await captureUserAgent(tab.id);
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  const payload = {
    cookies: cookies.map(serializeCookie),
    routes,
  };
  if (cookieHeader.length <= COOKIE_HEADER_MAX) {
    payload.cookie = cookieHeader;
  }
  if (webStorage.local && Object.keys(webStorage.local).length) {
    payload.local_storage = webStorage.local;
  }
  if (webStorage.session && Object.keys(webStorage.session).length) {
    payload.session_storage = webStorage.session;
  }
  if (webStorage.origins && webStorage.origins.length) {
    payload.origins = webStorage.origins;
  }
  if (userAgent) {
    payload.user_agent = userAgent;
  }
  const authorization = String(buffered[AUTH_HEADER_KEY] || "").trim();
  if (authorization) {
    payload.authorization = authorization;
  }

  const url = `${armed.apiBase}/target-session/capture/${armed.ticket}`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return {
      ok: false,
      error: `Falha ao falar com a API (${armed.apiBase}): ${error}`,
    };
  }

  const body = await response.json().catch(() => ({}));

  if (
    response.status === 422 &&
    typeof body.message === "string" &&
    /already been used|expired|consum/i.test(body.message)
  ) {
    await clearArm();
    await notifyShingekiTabs(armed.clientOrigin);
    return {
      ok: true,
      connected: true,
      alreadyCaptured: true,
      cookieCount: cookies.length,
      routeCount: routes.length,
      message:
        "Esta captura ja tinha sido enviada. Confira no Shingeki se a sessao esta Conectada.",
    };
  }

  if (!response.ok || !body.connected) {
    return {
      ok: false,
      error: body.message ?? `API respondeu ${response.status}`,
    };
  }

  await clearArm();
  await notifyShingekiTabs(armed.clientOrigin);

  return {
    ok: true,
    connected: true,
    cookieCount: cookies.length,
    routeCount: routes.length,
    auth_type: body.auth_type,
    message: `Sessao enviada (${cookies.length} cookie(s), ${routes.length} rota(s)). Volte ao Shingeki.`,
  };
}

async function collectCookies(tabUrl, origin, host) {
  const apex = apexHost(host);
  const batches = await Promise.all([
    chrome.cookies.getAll({ url: tabUrl }),
    chrome.cookies.getAll({ domain: host }),
    apex !== host ? chrome.cookies.getAll({ domain: apex }) : Promise.resolve([]),
    partitionedCookies(origin, tabUrl),
  ]);
  const merged = new Map();
  for (const cookie of batches.flat()) {
    if (!cookie?.name) continue;
    const domain = String(cookie.domain || "").replace(/^\./, "").toLowerCase();
    if (!(domain === apex || domain.endsWith(`.${apex}`) || domain === host.toLowerCase())) {
      continue;
    }
    const partition = cookie.partitionKey?.topLevelSite || "";
    merged.set(`${cookie.name}|${cookie.domain}|${cookie.path}|${partition}`, cookie);
  }
  return [...merged.values()];
}

async function partitionedCookies(origin, tabUrl) {
  try {
    return await chrome.cookies.getAll({
      url: tabUrl,
      partitionKey: { topLevelSite: origin },
    });
  } catch {
    try {
      return await chrome.cookies.getAll({
        partitionKey: { topLevelSite: origin },
      });
    } catch {
      return [];
    }
  }
}

function serializeCookie(cookie) {
  const row = {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain || "",
    path: cookie.path || "/",
    secure: Boolean(cookie.secure),
    httpOnly: Boolean(cookie.httpOnly),
    hostOnly: Boolean(cookie.hostOnly),
    session: Boolean(cookie.session),
  };
  if (cookie.sameSite) {
    row.sameSite = cookie.sameSite;
  }
  if (!cookie.session && typeof cookie.expirationDate === "number") {
    row.expirationDate = cookie.expirationDate;
  }
  if (cookie.partitionKey?.topLevelSite) {
    row.partitionKey = {
      topLevelSite: cookie.partitionKey.topLevelSite,
      hasCrossSiteAncestor: Boolean(cookie.partitionKey.hasCrossSiteAncestor),
    };
  }
  return row;
}

async function captureWebStorage(tabId) {
  try {
    const injected = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      world: "MAIN",
      func: dumpWebStorage,
    });
    const local = {};
    const session = {};
    const origins = [];
    for (const entry of injected || []) {
      const result = entry?.result;
      if (!result || typeof result !== "object") continue;
      const originLocal = result.local && typeof result.local === "object" ? result.local : {};
      const originSession = result.session && typeof result.session === "object" ? result.session : {};
      Object.assign(local, originLocal);
      Object.assign(session, originSession);
      if (result.origin && (Object.keys(originLocal).length || Object.keys(originSession).length)) {
        origins.push({
          origin: result.origin,
          local: originLocal,
          session: originSession,
        });
      }
    }
    return { local, session, origins };
  } catch {
    return { local: {}, session: {}, origins: [] };
  }
}

function dumpWebStorage() {
  const skipKey = (key) =>
    /^(persist:|redux|@@|__cf)/i.test(String(key || ""));

  const dump = (storage) => {
    const out = {};
    if (!storage) return out;
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key || skipKey(key)) continue;
      const value = storage.getItem(key);
      if (typeof value !== "string" || value.length === 0 || value.length > 8192) {
        continue;
      }
      out[key] = value;
      if (Object.keys(out).length >= 50) break;
    }
    return out;
  };

  return {
    origin: location.origin,
    local: dump(window.localStorage),
    session: dump(window.sessionStorage),
  };
}

async function capturePerformanceRoutes(tabId) {
  try {
    const injected = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      world: "MAIN",
      func: dumpResourceRoutes,
    });
    const routes = [];
    for (const entry of injected || []) {
      if (Array.isArray(entry?.result)) {
        routes.push(...entry.result);
      }
    }
    return routes;
  } catch {
    return [];
  }
}

function dumpResourceRoutes() {
  const keep = new Set(["xmlhttprequest", "fetch", "beacon"]);
  return (performance.getEntriesByType("resource") || [])
    .filter((entry) => keep.has(String(entry.initiatorType || "")))
    .slice(-150)
    .map((entry) => ({
      method: "GET",
      url: String(entry.name || "").split("#")[0],
      type: entry.initiatorType,
    }))
    .filter((route) => route.url.startsWith("http"));
}

async function captureUserAgent(tabId) {
  try {
    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => navigator.userAgent,
    });
    const value = injected?.[0]?.result;
    return typeof value === "string" ? value.slice(0, 512) : "";
  } catch {
    return "";
  }
}

function mergeRoutes(...groups) {
  const out = [];
  const seen = new Set();
  for (const group of groups) {
    for (const route of group || []) {
      const method = String(route.method || "GET").toUpperCase();
      const url = String(route.url || "").split("#")[0];
      if (!url.startsWith("http")) continue;
      const key = `${method} ${url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        method,
        url,
        type: String(route.type || ""),
      });
      if (out.length >= MAX_ROUTES) {
        return out;
      }
    }
  }
  return out;
}

async function notifyShingekiTabs(clientOrigin) {
  if (!clientOrigin) return;
  try {
    const tabs = await chrome.tabs.query({ url: `${clientOrigin}/*` });
    for (const clientTab of tabs) {
      if (!clientTab.id) continue;
      await chrome.tabs
        .sendMessage(clientTab.id, {
          type: "shingeki-target-session-connected",
        })
        .catch(() => undefined);
    }
  } catch {
  }
}
