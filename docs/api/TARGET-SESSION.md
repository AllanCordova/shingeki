# API — Sessao do alvo (DAST autenticado)

Conecta a sessao autenticada do alvo para o worker DAST acessar rotas protegidas. Voltar ao [indice da API](../API.md).

## Fluxo recomendado (popup)

1. Client chama `POST .../target-session/connect/start` com `client_origin`.
2. Abre `popup_url` em janela separada.
3. Usuario faz login no alvo.
4. Sessao e capturada automaticamente:
   - **Mesma origem** (`target_url` = URL do client): pagina `/conectar-alvo`.
   - **Alvo externo**: redirect para `/shingeki-capture.php?ticket=...` no alvo (incluido no lab).
5. Popup fecha e o client atualiza o status via `postMessage`.

Importacao manual (`POST .../target-session`) permanece disponivel apenas como opcao avancada.

Base: `/api/projects/{project}/systems/{system}/target-session`

## POST .../target-session/connect/start

Inicia captura via popup.

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
  "capture_callback_url": null
}
```

Para alvos externos, `mode` e `external` e `capture_callback_url` aponta para `/shingeki-capture.php` no alvo.

## POST /api/target-session/capture/{ticket}

Rota publica (sem Sanctum). Finaliza a captura usando o ticket de curta duracao.

**Body (JSON):** `cookie` ou `authorization`.

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

Na pagina do sistema, clique **Conectar ao alvo**, faca login na janela que abrir e aguarde a confirmacao.

Campo opcional `login_url` no sistema sobrescreve a URL de login usada no popup externo.
