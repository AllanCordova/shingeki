const ARM_KEY = "armedCapture";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void handleMessage(message).then(sendResponse);
  return true;
});

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  void handleMessage(message).then(sendResponse);
  return true;
});

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

  // Persist before openUrl: tab creation can exceed the web app bridge timeout.
  await chrome.storage.session.set({ [ARM_KEY]: payload });

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
  await chrome.storage.session.remove(ARM_KEY);
  try {
    await chrome.action.setBadgeText({ text: "" });
  } catch {
  }
}

function originsMatch(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

async function resolveTargetTab(armed) {
  if (armed.loginTabId != null) {
    try {
      const tab = await chrome.tabs.get(armed.loginTabId);
      if (tab?.url && !tab.url.startsWith("chrome://")) {
        const origin = new URL(tab.url).origin;
        if (originsMatch(origin, armed.targetOrigin)) {
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
      if (originsMatch(origin, armed.targetOrigin)) {
        return active;
      }
    } catch {
    }
  }

  return null;
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
  try {
    tabOrigin = new URL(tab.url).origin;
  } catch {
    return { ok: false, error: "URL da aba do alvo invalida." };
  }

  if (!originsMatch(tabOrigin, armed.targetOrigin)) {
    return {
      ok: false,
      error: `A aba encontrada e ${tabOrigin}, mas o ticket espera ${armed.targetOrigin}.`,
    };
  }

  const host = new URL(tab.url).hostname;
  const apex = host.startsWith("www.") ? host.slice(4) : host;
  const byUrl = await chrome.cookies.getAll({ url: tab.url });
  const byHost = await chrome.cookies.getAll({ domain: host });
  const byApex = apex !== host ? await chrome.cookies.getAll({ domain: apex }) : [];
  const merged = new Map();
  for (const cookie of [...byApex, ...byHost, ...byUrl]) {
    merged.set(`${cookie.name}|${cookie.domain}|${cookie.path}`, cookie);
  }
  const cookies = [...merged.values()].filter((cookie) => {
    const domain = String(cookie.domain || "").replace(/^\./, "").toLowerCase();
    return domain === apex || domain.endsWith(`.${apex}`) || domain === host;
  });

  if (!cookies.length) {
    return {
      ok: false,
      error: "Nenhum cookie encontrado no dominio do alvo. Confirme que voce esta logado.",
    };
  }

  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const url = `${armed.apiBase}/target-session/capture/${armed.ticket}`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ cookie: cookieHeader }),
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
    auth_type: body.auth_type,
    message: "Sessao enviada. Volte ao Shingeki — status deve aparecer Conectada.",
  };
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
