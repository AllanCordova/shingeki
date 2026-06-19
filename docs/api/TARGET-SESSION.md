# API — Sessao do alvo (DAST autenticado)

Importacao manual de cookie ou Bearer token para o worker DAST acessar rotas protegidas. Voltar ao [indice da API](../API.md).

OAuth 2.0 com redirect ficara para uma fase posterior; esta API cobre a **Fase 1** (importar sessao apos login manual no alvo).

Base: `/api/projects/{project}/systems/{system}/target-session`

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

Na pagina do sistema, use **Importar sessao** apos login no alvo:

1. Abra DevTools → Network ou Application → Cookies.
2. Copie o header `Cookie` ou o token `Authorization`.
3. Cole no painel **Sessao do alvo**.
4. Dispare o DAST normalmente.
