import { chromium } from "playwright";
import { parseArgs } from "node:util";
import { mergeSessionStorage, originOf } from "./state.mjs";

const { values } = parseArgs({
  options: {
    "login-url": { type: "string" },
    "complete-url": { type: "string" },
    "capture-id": { type: "string" },
  },
});

const loginUrl = values["login-url"]?.trim() ?? "";
const completeUrl = values["complete-url"]?.trim() ?? "";
const captureId = values["capture-id"]?.trim() ?? "";

if (!loginUrl || !completeUrl) {
  console.error(
    "Uso: node capture.mjs --login-url URL --complete-url URL [--capture-id UUID]",
  );
  process.exit(1);
}

if (captureId) {
  console.log(`capture_id=${captureId}`);
}

const buttonScript = () => {
  const id = "shingeki-login-done";
  const mount = () => {
    if (document.getElementById(id)) {
      return;
    }
    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    button.textContent = "Login concluído — iniciar scan";
    button.setAttribute(
      "style",
      [
        "position:fixed",
        "bottom:16px",
        "right:16px",
        "z-index:2147483647",
        "padding:12px 16px",
        "border:0",
        "border-radius:8px",
        "background:#111827",
        "color:#fff",
        "font:600 14px/1.2 sans-serif",
        "cursor:pointer",
        "box-shadow:0 8px 24px rgba(0,0,0,.35)",
      ].join(";"),
    );
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.disabled = true;
      button.textContent = "Enviando sessão...";
      const done = globalThis.__shingekiLoginDone;
      if (typeof done !== "function") {
        button.disabled = false;
        button.textContent = "Login concluído — iniciar scan";
        return;
      }
      Promise.resolve(done()).catch(() => {
        button.disabled = false;
        button.textContent = "Login concluído — iniciar scan";
      });
    });
    (document.body || document.documentElement).appendChild(button);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
  new MutationObserver(mount).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
};

async function readSessionItems(page) {
  return page.evaluate(() => {
    const items = [];
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const name = sessionStorage.key(index);
      if (!name) {
        continue;
      }
      const value = sessionStorage.getItem(name);
      if (typeof value === "string") {
        items.push({ name, value });
      }
    }
    return items;
  });
}

async function collectState(context) {
  const state = await context.storageState();
  for (const page of context.pages()) {
    const origin = originOf(page.url());
    if (!origin) {
      continue;
    }
    try {
      const items = await readSessionItems(page);
      Object.assign(state, { origins: mergeSessionStorage(state, origin, items).origins });
    } catch {
      // A page can close while the button is clicked.
    }
  }
  return state;
}

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();

const visitedUrls = [];
const seenUrls = new Set();
const rememberUrl = (url) => {
  if (typeof url !== "string") {
    return;
  }
  const trimmed = url.trim();
  if (
    trimmed === "" ||
    trimmed === "about:blank" ||
    trimmed.startsWith("devtools:") ||
    seenUrls.has(trimmed)
  ) {
    return;
  }
  seenUrls.add(trimmed);
  visitedUrls.push(trimmed);
  if (captureId) {
    console.log(`navigated capture_id=${captureId} url=${trimmed}`);
  }
};

let finish;
const done = new Promise((resolve) => {
  finish = resolve;
});

await context.exposeBinding("__shingekiLoginDone", async () => {
  finish();
});
await context.addInitScript(buttonScript);

const page = await context.newPage();
page.on("framenavigated", (frame) => {
  if (frame === page.mainFrame()) {
    rememberUrl(frame.url());
  }
});
await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
rememberUrl(page.url());

console.log("Entre no alvo e clique em Login concluído — iniciar scan.");
await done;

const state = await collectState(context);
state.visited_urls = visitedUrls;

let response;
try {
  response = await fetch(completeUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(state),
  });
} catch {
  console.error("Não foi possível devolver a sessão para a API.");
  await browser.close();
  process.exit(1);
}

const body = await response.text();
await browser.close();

if (!response.ok) {
  console.error(`A API recusou a sessão (${response.status}).`);
  if (body && !body.includes("eyJ") && body.length < 500) {
    console.error(body);
  }
  process.exit(1);
}

console.log("Sessão enviada. O scan foi iniciado.");
