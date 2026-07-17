(() => {
  const SOURCE = "shingeki-extension";

  function humanizeRuntimeError(message) {
    const text = String(message || "");
    if (/extension context invalidated/i.test(text) || /context invalidated/i.test(text)) {
      return "Extensao foi recarregada. Atualize esta pagina (F5) e clique Conectar de novo.";
    }
    if (/receiving end does not exist/i.test(text)) {
      return "Extensao nao respondeu. Atualize esta pagina (F5) e tente novamente.";
    }
    return text || "Falha ao falar com a extensao.";
  }

  function reply(requestId, type, response, runtimeError) {
    const error = runtimeError ? humanizeRuntimeError(runtimeError) : null;
    window.postMessage(
      {
        source: SOURCE,
        type: `${type}.result`,
        requestId: requestId ?? null,
        ok: !error && Boolean(response?.ok),
        response: error
          ? { ok: false, error }
          : response ?? { ok: false, error: "Empty response from extension" },
      },
      window.location.origin,
    );
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== "shingeki-web" || !data.type) return;

    const requestId = data.requestId ?? null;
    const type = data.type;

    const {
      source: _source,
      requestId: _requestId,
      ...payload
    } = data;

    try {
      if (!chrome?.runtime?.id) {
        reply(requestId, type, null, "Extension context invalidated.");
        return;
      }

      chrome.runtime.sendMessage(payload, (response) => {
        const error = chrome.runtime.lastError?.message;
        reply(requestId, type, response, error);
      });
    } catch (error) {
      reply(
        requestId,
        type,
        null,
        error instanceof Error ? error.message : String(error),
      );
    }
  });

  try {
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === "shingeki-target-session-connected") {
        window.postMessage(
          {
            source: SOURCE,
            type: "shingeki-target-session-connected",
          },
          window.location.origin,
        );
      }
    });
  } catch {
    // Page still holds a stale content-script after extension reload.
  }

  window.postMessage(
    {
      source: SOURCE,
      type: "shingeki.ready",
    },
    window.location.origin,
  );
})();
