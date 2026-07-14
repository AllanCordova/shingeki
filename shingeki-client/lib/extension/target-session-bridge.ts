"use client";

type ExtensionResponse = {
  ok?: boolean;
  error?: string;
  version?: string;
  armed?: unknown;
  connected?: boolean;
};

type BridgeResult = {
  ok: boolean;
  response?: ExtensionResponse;
  error?: string;
};

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage?: (
          extensionId: string,
          message: unknown,
          callback?: (response: ExtensionResponse) => void,
        ) => void;
        lastError?: { message?: string };
      };
    };
  }
}

const PING_TIMEOUT_MS = 2500;
const ARM_TIMEOUT_MS = 8000;

function nextRequestId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function pingShingekiExtension(): Promise<boolean> {
  const viaBridge = await sendViaContentBridge(
    { type: "shingeki.ping" },
    PING_TIMEOUT_MS,
  );
  if (viaBridge.ok) return true;

  const extensionId = process.env.NEXT_PUBLIC_SHINGEKI_EXTENSION_ID?.trim();
  if (!extensionId || !window.chrome?.runtime?.sendMessage) {
    return false;
  }

  return new Promise((resolve) => {
    try {
      window.chrome!.runtime!.sendMessage!(
        extensionId,
        { type: "shingeki.ping" },
        (response) => {
          if (window.chrome?.runtime?.lastError) {
            resolve(false);
            return;
          }
          resolve(Boolean(response?.ok));
        },
      );
    } catch {
      resolve(false);
    }
  });
}

export async function armShingekiExtension(payload: {
  ticket: string;
  apiBase: string;
  targetOrigin: string;
  clientOrigin: string;
  openUrl?: string;
  systemName?: string;
  expiresAt?: number;
}): Promise<BridgeResult> {
  const message = {
    type: "shingeki.armCapture",
    ...payload,
  };

  const viaBridge = await sendViaContentBridge(message, ARM_TIMEOUT_MS);
  if (viaBridge.ok) return viaBridge;

  const extensionId = process.env.NEXT_PUBLIC_SHINGEKI_EXTENSION_ID?.trim();
  if (!extensionId || !window.chrome?.runtime?.sendMessage) {
    return {
      ok: false,
      error: viaBridge.error ?? "Extensao Shingeki nao detectada.",
    };
  }

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      resolve({ ok: false, error: "Extensao nao respondeu." });
    }, ARM_TIMEOUT_MS);

    try {
      window.chrome!.runtime!.sendMessage!(
        extensionId,
        message,
        (response) => {
          window.clearTimeout(timer);
          if (window.chrome?.runtime?.lastError) {
            resolve({
              ok: false,
              error: window.chrome.runtime.lastError.message,
            });
            return;
          }
          resolve({
            ok: Boolean(response?.ok),
            response,
            error: response?.error,
          });
        },
      );
    } catch (error) {
      window.clearTimeout(timer);
      resolve({
        ok: false,
        error: error instanceof Error ? error.message : "Falha ao armar extensao.",
      });
    }
  });
}

function sendViaContentBridge(
  message: Record<string, unknown>,
  timeoutMs: number,
): Promise<BridgeResult> {
  if (typeof window === "undefined") {
    return Promise.resolve({ ok: false, error: "No window" });
  }

  const requestId = nextRequestId();
  const expectedType = `${String(message.type)}.result`;

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result: BridgeResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(result);
    };

    const timer = window.setTimeout(() => {
      finish({ ok: false, error: "Extensao nao respondeu." });
    }, timeoutMs);

    function onMessage(event: MessageEvent) {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.source !== "shingeki-extension") return;
      if (data.type !== expectedType) return;
      if (data.requestId != null && data.requestId !== requestId) return;

      finish({
        ok: Boolean(data.ok),
        response: data.response,
        error: data.response?.error,
      });
    }

    window.addEventListener("message", onMessage);
    window.postMessage(
      {
        source: "shingeki-web",
        requestId,
        ...message,
      },
      window.location.origin,
    );
  });
}
