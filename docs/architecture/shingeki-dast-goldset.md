# Treino DAST — goldset in-process

O DAST treina evidência e catálogo com **fixtures HTTP** (`httptest`). Não há Juice Shop nem lab PHP no Docker.

```bash
npm run test:dast
```

Corre o `go test` do goldset e os três harness. Um de cada vez: `test:dast-secrets` (token + XSS), `test:dast-access` (BOLA / admin / mass assignment / tenant), `test:dast-inject` (SQLi, redirect, JWT, path, CSRF).

Cada fixture tem um handler vulnerável (HIT) e um patched (MISS). O harness sobe o alvo in-process e corre o scanner real.

## secrets

JSON `/api/config` com `sk_live_`, chunk JS com `ghp_`, XSS refletido em `/preview?q=`.

## access

| Challenge | Vetor |
|-----------|--------|
| `admin-unauth` | `GET /api/admin/users` sem `Authorization` |
| `order-bola` | token da Alice lê `GET /api/orders/ord_bob` |
| `mass-assignment` | `PATCH /api/profile` aceita `role=admin` |
| `tenant-isolation` | token da Alice lê `GET /api/tenants/tenant-b` |

Patched: 401/403 e ignora campos privilegiados.

## inject

| Challenge | Vetor |
|-----------|--------|
| `login-sqli` | `POST /api/login` JSON `' OR 1=1 --` |
| `search-sqli` | `GET /search?q=` erro SQLite |
| `form-login-sqli` | `POST /login` form, sessão cookie no CSRF |
| `open-redirect` | `GET /redirect?to=https://evil.example/phish` |
| `jwt-none` | `GET /api/me` com `alg=none` |
| `path-confidential` | `GET /files/acquisitions.md` |
| `csrf-change-password` | `POST /api/password` com `Origin` cruzado |

XSS refletido já está em **secrets**. DOM XSS no Chromium não faz parte deste gabarito.

## SAST

Amostras em [`workers/sast/testdata/goldset/`](../../workers/sast/testdata/goldset/): segredo hardcoded, `dangerouslySetInnerHTML`, SQL sem filtro de tenant, Action com tag flutuante.
