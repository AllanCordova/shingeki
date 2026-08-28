# API — Sessao do alvo (DAST autenticado)

Conecta a sessao autenticada do alvo para o worker DAST acessar rotas protegidas. Voltar ao [indice da API](../API.md).

## Fluxos de captura

### 1. Extensao Chrome/Edge (recomendado para SaaS)

Pacote [`apps/extension`](https://github.com/AllanCordova/shingeki/blob/main/apps/extension/README.md).

1. Client chama `POST .../target-session/connect/start`.
2. Se a extensao estiver instalada e o modo for `external`, o client **arma** a extensao (`ticket`, `capture_api_base`, `target_origin`, `openUrl`) e a extensao abre o login em **aba normal** (nao popup).
3. Usuario faz login na aba do alvo.
4. Na extensao: **Capturar sessao** → a extensao resolve a aba do `target_origin` (mesmo se a aba ativa for outra) → `POST /api/target-session/capture/{ticket}`.
5. O client atualiza o status via polling (2s / 120s) ou mensagem da extensao.

Download da extensão empacotada pelo client: `/extensions/shingeki-target-session.zip`. Como gerar o ZIP e carregar no Chrome: [README da extensão](https://github.com/AllanCordova/shingeki/blob/main/apps/extension/README.md).

### 2. Popup cooperativo (lab)

1. Client chama `POST .../target-session/connect/start` com `client_origin`.
2. Abre `popup_url` em janela separada.
3. Usuario faz login no alvo.
4. Sessao e capturada automaticamente:
   - **Mesma origem** (`target_url` = URL do client): pagina `/conectar-alvo`.
   - **Alvo externo cooperativo**: redirect para `/shingeki-capture.php?ticket=...` no alvo (incluido no lab).
5. Popup fecha e o client atualiza o status via `postMessage`.

### 3. Importacao manual

`POST .../target-session` com cookie ou Bearer (UI avancada no painel).

Base: `/api/projects/{project}/systems/{system}/target-session`

## POST .../target-session/connect/start

Inicia captura via popup e/ou extensao.

**Body (JSON):**

| Campo | Regras |
|-------|--------|
| `client_origin` | URL do client (ex.: `http://localhost:3000`) |

**Resposta `200`:**

```json
{
  "message": "Target session capture started.",
  "ticket": "uuid",
  "mode": "same_origin",
  "popup_url": "http://localhost:3000/conectar-alvo?ticket=...",
  "open_url": "http://localhost:3000/conectar-alvo?ticket=...",
  "capture_callback_url": null,
  "capture_api_base": "http://127.0.0.1:8000/api",
  "target_origin": "http://localhost:3000",
  "client_origin": "http://localhost:3000",
  "extension_supported": true,
  "expires_at": "2026-07-14T12:00:00+00:00"
}
```

| Campo | Uso |
|-------|-----|
| `popup_url` | Lab / same_origin: URL aberta pelo fluxo antigo (pode incluir `next` no lab) |
| `open_url` | URL limpa para abrir com extensao (login sem depender do capture PHP) |
| `capture_api_base` | Base da API usada pela extensao no POST publico |
| `extension_supported` | Sempre `true` neste contrato (a UI decide se a extensao esta instalada) |

Para alvos externos, `mode` e `external` e `capture_callback_url` aponta para `/shingeki-capture.php` no alvo (fluxo lab).

No lab, o popup redireciona para `/shingeki-capture.php?ticket=...` após o login. Vetores autenticados e credenciais: [shingeki-vulnerable-target.md](../architecture/shingeki-vulnerable-target.md).

## POST /api/target-session/capture/{ticket}

Rota publica (sem Sanctum). Finaliza a captura usando o ticket de curta duracao (15 min, uso unico).

Usada pelo lab (`shingeki-capture.php`), pela pagina `/conectar-alvo` e pela **extensao**.

**Body (JSON):** `cookie` ou `authorization`.

CORS: origins de lab + padroes `chrome-extension://…` e localhost (ver `config/cors.php`).

## GET .../target-session

Retorna se existe sessao ativa importada pelo usuario autenticado.

**Resposta `200` (desconectado):**

```json
{
  "connected": false
}
```

**Resposta `200` (conectado):**

```json
{
  "connected": true,
  "auth_type": "cookie",
  "header_names": ["Cookie"],
  "expires_at": null,
  "updated_at": "..."
}
```

Os valores dos headers **nunca** sao retornados na API.

## POST .../target-session

Importa ou atualiza a sessao do alvo.

**Body (JSON):**

| Campo | Regras |
|-------|--------|
| `auth_type` | `cookie` ou `bearer` |
| `credential` | Valor do header Cookie ou token Bearer (com ou sem prefixo `Bearer`) |
| `expires_at` | Opcional; ISO 8601 |

**Resposta `201`:**

```json
{
  "message": "Target session imported successfully.",
  "connected": true,
  "auth_type": "cookie",
  "header_names": ["Cookie"],
  "expires_at": null,
  "updated_at": "..."
}
```

## DELETE .../target-session

Remove a sessao importada.

**Resposta `200`:** sessao removida.

**Resposta `404`:** nenhuma sessao encontrada.

## Uso no dispatch DAST

Quando existe sessao ativa, o batch publicado em `attacks.dispatch` inclui:

```json
{
  "auth": {
    "type": "cookie",
    "headers": {
      "Cookie": "laravel_session=..."
    }
  }
}
```

O worker repassa esses headers no discovery (Colly/Rod) e em todas as requisicoes de ataque.

A resposta do dispatch inclui `target_session_connected: true|false`.

## Client web

Na pagina do sistema: **Conectar ao alvo**.

- Com extensao: login no site → Capturar na extensao.
- Sem extensao / lab: popup automatico quando o alvo coopere.
- Fallback: import manual Cookie/Bearer.

Campo opcional `login_url` no sistema sobrescreve a URL de login (`open_url` / base do popup externo). Ver [PROJECTS-AND-SYSTEMS.md](PROJECTS-AND-SYSTEMS.md).

Env opcional do client: `NEXT_PUBLIC_SHINGEKI_EXTENSION_ID` (só se quiser messaging direto; o content script em localhost não precisa). Detalhes de empacotamento: [README da extensão](https://github.com/AllanCordova/shingeki/blob/main/apps/extension/README.md).
