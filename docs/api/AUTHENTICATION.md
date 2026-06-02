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
    "role": "user",
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
