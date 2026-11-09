# API — Sessão capturada do navegador (DAST autenticado)

O scan autenticado nasce de uma sessão que a pessoa abre no Chromium. A API não guarda usuário nem senha do alvo. O worker recebe cookies e storage cifrados e injeta só no host do alvo. IndexedDB fica de fora.

Voltar ao [índice da API](../API.md).

## URL de login

`POST /api/projects/{project}/systems` e `PUT .../systems/{system}` aceitam `login_url`. É a página que o Chromium abre. Vazia, a captura usa `target_url`. A resposta do sistema devolve `login_url` e não devolve senha, modo de login nem corpo de cadastro.

DAST sem sessão continua em `POST .../attacks/dispatch`. Esse disparo não leva `auth`.

## Captura

`POST .../attacks/session-captures` exige o mesmo aceite do dispatch (`accepted_responsibility`, `accepted_legal_terms`, `terms_version`) e aceita `depth`, `start_path`, `max_routes` e `route_map`. Ainda não cria disparo.

**Resposta `201`:**

```json
{
  "capture": {
    "id": "uuid",
    "status": "pending",
    "expires_at": "2026-10-05T18:00:00.000000Z",
    "login_url": "https://alvo.exemplo.com/login",
    "dispatch_id": null
  },
  "token": "hex de 64 caracteres",
  "command": "node workers/capture/capture.mjs --login-url '...' --complete-url '...'",
  "remote_available": false
}
```

O token aparece só nessa resposta. O banco guarda `sha256`. `GET .../attacks/session-captures/{id}` devolve o status (`pending`, `completed`, `expired`) e, quando concluída, `dispatch_id`. Não devolve o token nem o estado.

`POST /api/session-captures/{token}/complete` fica fora do Sanctum. O token é o segredo, de uso único, com TTL `BROWSER_CAPTURE_TTL_MINUTES` (padrão 15). O corpo é o `storageState` do Playwright (`cookies` e `origins[].localStorage`), com `origins[].sessionStorage` acrescentado pelo script. A API cifra com AES-256-GCM, grava o envelope em `attack_dispatches.browser_state`, cria o disparo e publica o lote. A resposta é `{ "message", "dispatch_id" }` em `202`. Token ausente: `404`. Token já usado ou expirado: `410`.

Envelope: `{ "v": 1, "alg": "AES-256-GCM", "nonce", "ct" }`. A chave é `BROWSER_STATE_KEY`, 32 bytes em base64, a mesma na API e no worker. A fila leva `auth.type = browser_state` e esse envelope. Cookies e tokens não saem em claro na fila, na resposta nem nos logs.

## Comando local

Na raiz do repositório, com Playwright instalado em `workers/capture`:

```bash
node workers/capture/capture.mjs --login-url 'https://alvo.exemplo.com/login' --complete-url 'https://api.exemplo.com/api/session-captures/TOKEN/complete'
```

O Chromium abre visível. O botão **Login concluído — iniciar scan** reaparece a cada navegação. O clique envia o estado e o processo termina. O script não grava `state.json`.

## Navegador no painel

Com `CAPTURE_SERVICE_URL`, `CAPTURE_SERVICE_TOKEN` e `CAPTURE_NOVNC_PUBLIC_URL`, `remote_available` vem `true`. `POST .../attacks/session-captures/{id}/browser` recebe o token em claro, confere o hash e pede ao serviço `POST /sessions` um Chromium por vez. A API gera uma senha VNC dessa sessão e devolve `{ "novnc_url" }` já com `password`. Sem o serviço: `503`. Já existe um navegador aberto: `409`. Login fora do host do alvo: `422`.

`CAPTURE_NOVNC_PUBLIC_URL` aponta para `127.0.0.1:6080`. O Caddy não publica `/capture-browser`. Quem acessa de outra máquina usa um túnel até essa porta. A senha deixa de valer quando a captura termina.

O serviço é `workers/capture` (Playwright, Xvfb, noVNC). O mesmo `complete` encerra a sessão.

## Execução

O worker decifra em memória e injeta cookies e storage só no host do alvo e nos subdomínios dele. Probes para outros hosts saem sem cookie e sem `Authorization`. Um GET de controle, sem payload, acompanha a sessão. Se esse GET voltar `401` ou `403`, o worker publica o que já coletou e encerra com `status: session_expired`. `401` ou `403` de um payload de ataque continua sendo resultado de probe.

O painel mostra que a sessão precisa ser renovada. Renovar abre outra captura com o mesmo mapa, profundidade e limites, e gera um disparo novo. O disparo interrompido permanece com os achados já gravados.
