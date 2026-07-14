(() => {
  const SOURCE = "shingeki-extension";

  function reply(requestId, type, response, runtimeError) {
    window.postMessage(
      {
        source: SOURCE,
        type: `${type}.result`,
        requestId: requestId ?? null,
        ok: !runtimeError && Boolean(response?.ok),
        response: runtimeError
          ? { ok: false, error: runtimeError }
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

  window.postMessage(
    {
      source: SOURCE,
      type: "shingeki.ready",
    },
    window.location.origin,
  );
})();
