const statusEl = document.getElementById("status");
const detailsEl = document.getElementById("details");
const messageEl = document.getElementById("message");
const captureBtn = document.getElementById("capture");
const clearBtn = document.getElementById("clear");

async function refresh(keepMessage = false) {
  if (!keepMessage) {
    messageEl.textContent = "";
    messageEl.className = "";
  }

  try {
    const state = await chrome.runtime.sendMessage({ type: "shingeki.getArmState" });
    const armed = state?.armed;

    if (!armed) {
      statusEl.textContent = "Pronto";
      detailsEl.textContent =
        "No Shingeki: Conectar ao alvo. A extensao abre o login em uma aba normal. Depois de logar, clique Capturar aqui.";
      captureBtn.disabled = true;
      clearBtn.disabled = true;
      return;
    }

    statusEl.textContent = "Aguardando login no alvo";
    detailsEl.innerHTML = [
      armed.systemName
        ? `<div><strong>Sistema:</strong> ${escapeHtml(armed.systemName)}</div>`
        : "",
      `<div><strong>Alvo:</strong> <code>${escapeHtml(armed.targetOrigin)}</code></div>`,
      `<div>Faca login na aba do alvo (nao precisa estar nesta janela do popup).</div>`,
    ].join("");
    captureBtn.disabled = false;
    clearBtn.disabled = false;
  } catch (error) {
    statusEl.textContent = "Recarregue o popup";
    detailsEl.textContent =
      "Extensao foi recarregada. Feche este popup, atualize a pagina do Shingeki (F5) e clique Conectar de novo.";
    messageEl.textContent =
      error instanceof Error ? error.message : "Extension context invalidated";
    messageEl.className = "error";
    captureBtn.disabled = true;
    clearBtn.disabled = true;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

captureBtn.addEventListener("click", async () => {
  captureBtn.disabled = true;
  messageEl.textContent = "Capturando cookies do alvo...";
  messageEl.className = "";

  const result = await chrome.runtime.sendMessage({
    type: "shingeki.captureActiveTab",
  });

  if (!result?.ok) {
    messageEl.textContent = result?.error ?? "Falha na captura.";
    messageEl.className = "error";
    captureBtn.disabled = false;
    return;
  }

  messageEl.textContent =
    result.message ??
    `Sessao enviada (${result.cookieCount} cookie(s)). Volte ao Shingeki.`;
  messageEl.className = "ok";
  await refresh(true);
});

clearBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "shingeki.clearArm" });
  await refresh();
});

void refresh();
