# API — Login do scanner (DAST autenticado)

O worker DAST entra no alvo com usuário e senha gravados no sistema. A sessão nasce no scan — JSON, POST de form HTML ou Chromium. Não há cópia de cookie/token do Chrome da pessoa.

Voltar ao [índice da API](../API.md).

## Configurar no sistema

`POST /api/projects/{project}/systems` e `PUT .../systems/{system}` aceitam:

| Campo | Regras |
|-------|--------|
| `login_url` | Opcional. Página HTML do form (`/login.php`) ou endpoint JSON (`/api/auth/login`, `/rest/user/login`) |
| `login_username` | Opcional. E-mail ou usuário do alvo |
| `login_password` | Opcional. Write-only; nunca volta na API |
| `logged_in_indicator` | Opcional. Texto visível só depois do login |

A resposta do sistema inclui `login_configured: true|false` e `login_username`. Sem `login_password`.

`login_username` vazio no PUT limpa usuário e senha. Sem credenciais o DAST mapeia só a superfície pública.

Se o login estiver configurado e o worker não conseguir entrar, o dispatch **falha** (`status: failed`, `failure_reason` com `scanner login`). Não há crawl anônimo silencioso.

## Dispatch

`POST .../attacks/dispatch` publica `auth` no batch quando o login está configurado:

```json
{
  "auth": {
    "type": "credentials",
    "login_url": "https://alvo.exemplo.com/login",
    "username": "scanner@example.com",
    "password": "...",
    "logged_in_indicator": "Logout"
  }
}
```

A resposta inclui `scanner_login_configured: true|false`.

O worker:

1. Se `login_url` for um endpoint JSON (`/rest/`, `/api/`, `/auth/` + login), faz `POST` JSON com `{email,password}` e `{username,password}` e lê `{token,access_token}` ou cookie.
2. Se `login_url` for página HTML (`.php`, `.html`…), faz `POST` `application/x-www-form-urlencoded` e guarda a sessão (`PHPSESSID`).
3. Em SPA sem path JSON (ex. Juice Shop `/#/login`), cai em `POST /rest/user/login`.
4. Se ainda não houver sessão e o Chromium estiver ligado, preenche o form no browser.
5. Crawla autenticado (links, cliques, XHR) e reaproveita cookies/Bearer nos ataques HTTP.

Se JSON e form falharem, o job termina como `failed`. O client mostra: "O scanner não conseguiu entrar no alvo…".

Labs de treino (credenciais do seed): [Validar os workers](../RUN-PROJECT.md#validar-os-workers).
