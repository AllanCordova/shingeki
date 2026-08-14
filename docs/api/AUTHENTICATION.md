# API — Autenticação

Rotas em `/api/auth`. Voltar ao [índice da API](../API.md).

## POST /api/auth/register

Cadastra usuário e retorna token.

**Body (JSON):**

| Campo | Tipo | Regras |
|-------|------|--------|
| `name` | string | obrigatório, máx. 255 |
| `email` | string | obrigatório, e-mail único |
| `password` | string | obrigatório, mín. 8, `password_confirmation` |

**Resposta `201`:**

```json
{
  "message": "User registered successfully.",
  "user": {
    "id": "uuid",
    "name": "Nome",
    "email": "user@example.com",
    "avatar_path": null,
    "role": "USER",
    "created_at": "...",
    "updated_at": "..."
  },
  "token": "1|..."
}
```

## POST /api/auth/login

**Body (JSON):**

| Campo | Tipo |
|-------|------|
| `email` | string |
| `password` | string |

**Resposta `200`:** mesmo formato de `user` + `token`.

**Resposta `401`:**

```json
{
  "message": "Invalid credentials."
}
```

## Papéis (`role`)

| Valor | Descrição |
|-------|-----------|
| `USER` | Padrão no registro. Acesso a projetos, sistemas, ataques e remediação de achados. Sem catálogo nem proxy manual. |
| `SPECIALIST` | Gerencia o catálogo global (`/api/catalog/*`) e usa o proxy manual em sistemas próprios. Atribuído manualmente ou via seed de demonstração. |
| `ADMIN` | Acesso total ao catálogo, incluindo editar/remover registros de outros autores; proxy manual nos sistemas próprios. |

Detalhes das rotas de catálogo: [CATALOG.md](CATALOG.md). Administração de usuários: [ADMIN-USERS.md](ADMIN-USERS.md).

## POST /api/auth/logout

Requer autenticação. Revoga o token atual.

**Resposta `200`:**

```json
{
  "message": "Logged out successfully."
}
```

## GET /api/auth/me

Retorna o usuário autenticado.

**Resposta `200`:**

```json
{
  "user": { "...": "..." }
}
```

## PUT /api/auth/me

Atualiza perfil. Todos os campos são opcionais (`sometimes`).

**Body (JSON):**

| Campo | Regras |
|-------|--------|
| `name` | string, máx. 255 |
| `email` | e-mail único (exceto o próprio usuário) |
| `password` | mín. 8, `confirmed`; exige `current_password` |
| `current_password` | obrigatório quando `password` é enviado |

**Resposta `200`:**

```json
{
  "message": "Profile updated successfully.",
  "user": { "...": "..." }
}
```

## Google OIDC (login / registro com Google)

O mesmo botão **Continuar com Google** serve para login e registro: se o `sub`/e-mail ainda não existir, a API cria o usuário (`password` nulo); se já existir, vincula `google_id` e autentica.

Fluxo **Authorization Code + ID Token** (Socialite `stateless`). A identidade é aceita só após o backend verificar o JWT do Google (`aud` = nosso `GOOGLE_CLIENT_ID`, assinatura JWKS, `iss`, `exp`, com leeway de relógio). Não se usa Access Token + `/userinfo` para login (evita token substitution).

O BFF gera um **nonce** http-only no browser e a API amarra o código one-time a esse nonce; a troca (`exchange`) exige os dois — evita login CSRF por URL de callback roubada.

### GET /api/auth/google/redirect

Inicia o OAuth. Query opcional: `origin` (host do front allowlisted), `nonce` (do BFF).

### GET /api/auth/google/callback

Callback do Google Cloud. Troca o `code`, exige `id_token`, verifica o JWT, upsert do usuário (`google_id` = `sub`) e redireciona ao BFF com um **código one-time** (não o token Sanctum).

### POST /api/auth/google/exchange

**Body (JSON):**

| Campo | Tipo |
|-------|------|
| `code` | string (one-time handoff, TTL ~60s) |
| `nonce` | string (mesmo nonce do cookie do BFF) |

**Resposta `200`:** mesmo formato de login (`user` + `token`).

Configuração: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (ex.: `http://127.0.0.1:8000/api/auth/google/callback`). `FRONTEND_URL` + origens allowlisted para o retorno (`localhost` / `127.0.0.1`). Usuários só-Google podem ter `password` nulo; login email/senha exige senha.
