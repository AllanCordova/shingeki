<?php

declare(strict_types=1);

require_once __DIR__.'/../includes/layout.php';

$ticket = $_GET['ticket'] ?? '';
$clientOrigin = $_GET['client_origin'] ?? '';
$browserApiBase = normalizeBrowserApiBase(
    is_string($_GET['api_base'] ?? null) && $_GET['api_base'] !== ''
        ? (string) $_GET['api_base']
        : (getenv('SHINGEKI_API_BROWSER_URL') ?: 'http://127.0.0.1:8000/api'),
);

function normalizeBrowserApiBase(string $url): string
{
    $url = rtrim(trim($url), '/');

    if ($url === '') {
        return 'http://127.0.0.1:8000/api';
    }

    $host = parse_url($url, PHP_URL_HOST);
    if (! is_string($host)) {
        return 'http://127.0.0.1:8000/api';
    }

    $blockedHosts = ['host.docker.internal', 'vulnerable-target'];
    if (in_array(strtolower($host), $blockedHosts, true)) {
        return 'http://127.0.0.1:8000/api';
    }

    return $url;
}

renderHeader('Shingeki capture');

if ($ticket === '') {
    echo '<p style="color:red;">Missing capture ticket.</p>';
    renderFooter();
    exit;
}

$ticketJson = json_encode($ticket, JSON_THROW_ON_ERROR);
$clientOriginJson = json_encode($clientOrigin, JSON_THROW_ON_ERROR);
$browserApiBaseJson = json_encode($browserApiBase, JSON_THROW_ON_ERROR);
$connectedTypeJson = json_encode('shingeki-target-session-connected', JSON_THROW_ON_ERROR);

echo <<<HTML
<p id="capture-status">Enviando sessao para o Shingeki...</p>
<script>
(function () {
  var ticket = {$ticketJson};
  var clientOrigin = {$clientOriginJson};
  var apiBase = {$browserApiBaseJson};
  var connectedType = {$connectedTypeJson};
  var statusEl = document.getElementById("capture-status");

  function notifyOpener() {
    if (!window.opener) {
      return;
    }
    var target = clientOrigin || window.location.origin;
    window.opener.postMessage({ type: connectedType }, target);
  }

  function finishSuccess(message) {
    statusEl.style.color = "green";
    statusEl.textContent = message;
    notifyOpener();
    setTimeout(function () { window.close(); }, 1200);
  }

  function finishError(message) {
    statusEl.style.color = "red";
    statusEl.textContent = message;
    var retry = "/login.php?next=" + encodeURIComponent(window.location.pathname + window.location.search);
    statusEl.insertAdjacentHTML("afterend", '<p><a href="' + retry + '">Log in and retry capture</a></p>');
  }

  if (!document.cookie) {
    finishError("No session cookie found. Log in on the target first.");
    return;
  }

  fetch(apiBase + "/target-session/capture/" + encodeURIComponent(ticket), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cookie: document.cookie }),
  })
    .then(function (response) {
      return response.json().then(function (body) {
        return { ok: response.ok, body: body };
      }).catch(function () {
        return { ok: false, body: { message: "Invalid response from Shingeki API." } };
      });
    })
    .then(function (result) {
      if (result.ok && result.body && result.body.connected) {
        finishSuccess("Session connected. You can close this window.");
        return;
      }

      var message = (result.body && result.body.message) || "Capture rejected.";
      finishError(message);
    })
    .catch(function (error) {
      finishError(
        "Failed to reach Shingeki API at " + apiBase +
        ". Verifique se php artisan serve esta rodando e se APP_URL no .env da API e acessivel no navegador."
      );
    });
})();
</script>
HTML;

renderFooter();
