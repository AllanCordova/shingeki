# API — Administração de usuários

Rotas em `/api/admin/users` (somente `ADMIN`, `auth:sanctum`). Voltar ao [índice da API](../API.md).

## GET /api/admin/users

Lista usuários paginados.

**Query:**

| Campo | Tipo | Notas |
|-------|------|--------|
| `page` | int | |
| `per_page` | int | |
| `search` | string | nome ou e-mail |
| `role` | `USER` \| `SPECIALIST` \| `ADMIN` | filtro opcional |

## PUT /api/admin/users/{user}

Atualiza o papel. Não permite alterar o próprio papel. Não permite rebaixar o último `ADMIN`.

**Body:** `{ "role": "SPECIALIST" }`

## DELETE /api/admin/users/{user}

Remove a conta. Regras:

- Não pode remover a própria conta.
- Não pode remover o último `ADMIN`.
- Autoria de itens do **catálogo global** (`attacks` / `remediations`) é **reatribuída ao admin que executa a exclusão** (evita apagar o catálogo por cascade).
- Projetos e demais dados pessoais do usuário seguem as FKs existentes (em geral cascade).

## UI

No client: `/admin/users/permissoes` (redirect de `/admin/permissoes`).
