# API REST (Laravel)

Backend em [`apps/api/`](../apps/api/). Rotas REST usam o prefixo **`/api`**. GraphQL fica em **`POST /graphql`** (via BFF `/api/graphql`).

**Base URL local:** `http://127.0.0.1:8000/api`

!!! tip "Navegação"
    Use a **aba API** no topo e a **sidebar** para ir a um módulo. Esta página é **índice** de rotas e erros comuns — o contrato de cada endpoint vive no guia do módulo. Voltar ao [início](index.md).

## Autenticação

Rotas protegidas exigem:

```http
Authorization: Bearer {token}
```

O token vem de `POST /api/auth/register`, `POST /api/auth/login` ou `POST /api/auth/google/exchange` (Sanctum). Papéis: [AUTHENTICATION.md](api/AUTHENTICATION.md).

## Formato das requisições

| Tipo | `Content-Type` | Uso |
|------|----------------|-----|
| JSON | `application/json` | Maioria das rotas |
| Multipart | `multipart/form-data` | Projetos/sistemas **com** capa; `PUT /api/auth/me` com avatar |

## Respostas de erro comuns

| Status | Situação |
|--------|----------|
| `401` | Token ausente, inválido ou credenciais incorretas no login |
| `403` | Sem permissão (policy) ou papel insuficiente |
| `404` | Recurso inexistente ou fora do escopo do usuário |
| `422` | Validação (`errors` por campo) ou regra de negócio |

Exemplo de validação:

```json
{
  "message": "The name field is required.",
  "errors": {
    "name": ["The name field is required."]
  }
}
```

## Documentação por módulo

### Conta e recursos

| Módulo | Guia |
|--------|------|
| Autenticação, Google e papéis | [api/AUTHENTICATION.md](api/AUTHENTICATION.md) |
| Administração de usuários (`ADMIN`) | [api/ADMIN-USERS.md](api/ADMIN-USERS.md) |
| Projetos, sistemas e dashboard | [api/PROJECTS-AND-SYSTEMS.md](api/PROJECTS-AND-SYSTEMS.md) |
| Stacks tecnológicas | [api/STACKS.md](api/STACKS.md) |
| Capas, biblioteca e avatar | [api/COVERS.md](api/COVERS.md) |

### Scan e segurança

| Módulo | Guia |
|--------|------|
| Aceite de responsabilidade | [api/ATTACK-ACKNOWLEDGMENT.md](api/ATTACK-ACKNOWLEDGMENT.md) |
| Sessão do alvo | [api/TARGET-SESSION.md](api/TARGET-SESSION.md) |
| Ataques, probes, resultados, comparar, PDF | [api/ATTACKS-AND-RESULTS.md](api/ATTACKS-AND-RESULTS.md) |
| Arsenal manual (proxy) | [api/MANUAL-PROXY.md](api/MANUAL-PROXY.md) |
| Notificações in-app | [api/NOTIFICATIONS.md](api/NOTIFICATIONS.md) |

### Catálogo e remediação

| Módulo | Guia |
|--------|------|
| Catálogo global | [api/CATALOG.md](api/CATALOG.md) |
| Importação CSV | [api/CATALOG-BULK-IMPORT.md](api/CATALOG-BULK-IMPORT.md) |
| Remediação, IA, PR GitHub, histórico | [api/REMEDIATION.md](api/REMEDIATION.md) |

### GraphQL (sidebar)

Não é REST. Schema e regra de uso: [architecture/shingeki-api.md](architecture/shingeki-api.md#rest-vs-graphql).

## Índice de rotas

### Públicas

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/google/redirect`
- `GET /api/auth/google/callback`
- `POST /api/auth/google/exchange`
- `POST /api/target-session/capture/{ticket}`

### Protegidas (`auth:sanctum`)

- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `GET /api/cover-uploads`
- `DELETE /api/cover-uploads/{coverUpload}`
- `GET /api/stacks`
- `GET /api/systems` · `GET /api/systems/{system}`
- `PUT /api/systems/{system}/dispatch-settings`
- `GET|PUT /api/admin/users` e `DELETE /api/admin/users/{user}` (`ADMIN`)
- `GET|POST|PUT|DELETE /api/catalog/attacks` e `/api/catalog/attacks/{attack}` (`ADMIN`, `SPECIALIST`)
- `GET|POST|PUT|DELETE /api/catalog/remediations` e `/api/catalog/remediations/{remediation}` (`ADMIN`, `SPECIALIST`)
- `GET /api/catalog/attacks/import/template` · `POST /api/catalog/attacks/import`
- `GET /api/catalog/remediations/import/template` · `POST /api/catalog/remediations/import`
- `GET /api/catalog/imports/{import}` (somente imports do próprio usuário)
- `GET|POST /api/projects` · `GET|PUT|DELETE /api/projects/{project}`
- `GET /api/projects/{project}/dashboard`
- `GET|POST /api/projects/{project}/systems`
- `GET|PUT|DELETE /api/projects/{project}/systems/{system}`
- `GET|POST|DELETE .../target-session` · `POST .../target-session/connect/start`
- `GET .../attack-acknowledgment`
- `POST .../attacks/dispatch` (DAST) · `POST .../attacks/dispatch/sast` (SAST)
- `GET|POST .../manual-proxy/send` e CRUD `/manual-proxy/routes` (`ADMIN`, `SPECIALIST`)
- `GET /api/notifications` · `GET /api/notifications/unread-count`
- `PATCH /api/notifications/{id}/read` · `POST /api/notifications/read-all`
- `DELETE /api/notifications/{id}` · `DELETE /api/notifications`
- `GET .../system-results` · `DELETE .../system-results`
- `GET .../system-results/compare`
- `GET .../system-results/{attack_dispatch}` · `DELETE .../system-results/{attack_dispatch}`
- `GET .../system-results/{attack_dispatch}/export`
- `POST .../remediate` · `POST .../remediate/ai`
- `POST .../remediate/github-pr/preview` · `POST .../remediate/github-pr`
- `GET .../remediation-history`
- `POST /graphql` (sidebar; no BFF: `POST /api/graphql`)

Recursos aninhados (`project`, `system`) são resolvidos por UUID e restritos ao dono (policies). `...` = `/api/projects/{project}/systems/{system}`.

## URLs de mídia

`cover_path` e `avatar_path` vêm como `/storage/covers/{uuid}.ext`. No client:

```
{NEXT_PUBLIC_MEDIA_BASE_URL}{cover_path}
```

Exemplo: `http://127.0.0.1:8000` + `/storage/covers/abc.jpg`.
