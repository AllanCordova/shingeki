# API REST (Laravel)

Backend em [`shingeki-api/`](../shingeki-api/). Todas as rotas abaixo usam o prefixo **`/api`**.

**Base URL local:** `http://127.0.0.1:8000/api`

!!! tip "Navegação"
    Use a **aba API** no topo e a **sidebar** (Conta e recursos, Scan e segurança, Catálogo e remediação) para ir direto a um módulo. Esta página resume rotas e erros comuns. Voltar ao [início](index.md).

## Autenticação

Rotas protegidas exigem header:

```http
Authorization: Bearer {token}
```

O token é retornado em `POST /api/auth/register` e `POST /api/auth/login` (Laravel Sanctum).

## Formato das requisições

| Tipo | `Content-Type` | Uso |
|------|----------------|-----|
| JSON | `application/json` | Auth, assinaturas, disparo de ataque |
| Multipart | `multipart/form-data` | Projetos e sistemas **com** capa opcional (`cover` ou `cover_upload_id`); criação/atualização sem capa pode usar JSON |

## Respostas de erro comuns

| Status | Situação |
|--------|----------|
| `401` | Token ausente, inválido ou credenciais incorretas no login |
| `403` | Sem permissão (policy), papel insuficiente (`USER` em rotas de catálogo) ou assinatura ausente/expirada/não permitida no dispatch |
| `404` | Recurso inexistente ou fora do escopo do usuário |
| `422` | Validação (`errors` por campo) ou regra de negócio (ex.: capa em uso na biblioteca) |

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

Use esta página como índice. Detalhes de cada módulo ficam nos guias abaixo (também acessíveis pela **busca** do site, `Ctrl+K`).

### Conta e recursos

| Módulo | Guia |
|--------|------|
| Autenticação e papéis | [api/AUTHENTICATION.md](api/AUTHENTICATION.md) |
| Projetos e sistemas | [api/PROJECTS-AND-SYSTEMS.md](api/PROJECTS-AND-SYSTEMS.md) |
| Stacks tecnológicas | [api/STACKS.md](api/STACKS.md) |
| Capas e biblioteca | [api/COVERS.md](api/COVERS.md) |

### Scan e segurança

| Módulo | Guia |
|--------|------|
| Assinaturas digitais | [api/SIGNATURES.md](api/SIGNATURES.md) |
| Sessão do alvo (DAST autenticado) | [api/TARGET-SESSION.md](api/TARGET-SESSION.md) |
| Ataques DAST/SAST e resultados | [api/ATTACKS-AND-RESULTS.md](api/ATTACKS-AND-RESULTS.md) |
| Arsenal manual (proxy) | [api/MANUAL-PROXY.md](api/MANUAL-PROXY.md) |
| Notificações in-app | [api/NOTIFICATIONS.md](api/NOTIFICATIONS.md) |

### Catálogo e remediação

| Módulo | Guia |
|--------|------|
| Catálogo global (ataques e medicações) | [api/CATALOG.md](api/CATALOG.md) |
| Importação CSV do catálogo | [api/CATALOG-BULK-IMPORT.md](api/CATALOG-BULK-IMPORT.md) |
| Remediação (snippets) | [api/REMEDIATION.md](api/REMEDIATION.md) |
| Remediação com IA | [api/REMEDIATION.md](api/REMEDIATION.md#post-remediateai) |

## Índice de rotas

### Públicas

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/target-session/capture/{ticket}`

### Protegidas (`auth:sanctum`)

- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `GET /api/cover-uploads`
- `DELETE /api/cover-uploads/{coverUpload}`
- `GET /api/stacks`
- `GET|POST|PUT|DELETE /api/catalog/attacks` e `/api/catalog/attacks/{attack}` (`ADMIN`, `SPECIALIST`)
- `GET|POST|PUT|DELETE /api/catalog/remediations` e `/api/catalog/remediations/{remediation}` (`ADMIN`, `SPECIALIST`)
- `GET /api/catalog/attacks/import/template`
- `POST /api/catalog/attacks/import`
- `GET /api/catalog/remediations/import/template`
- `POST /api/catalog/remediations/import`
- `GET /api/catalog/imports/{import}` (somente imports do próprio usuário)
- `GET|POST /api/projects`
- `GET|PUT|DELETE /api/projects/{project}`
- `GET|POST /api/projects/{project}/systems`
- `GET|PUT|DELETE /api/projects/{project}/systems/{system}`
- `POST /api/projects/{project}/systems/{system}/signatures/generate`
- `POST /api/projects/{project}/systems/{system}/signatures/validate`
- `POST /api/projects/{project}/systems/{system}/signatures/revoke`
- `GET /api/projects/{project}/systems/{system}/target-session`
- `POST /api/projects/{project}/systems/{system}/target-session`
- `POST /api/projects/{project}/systems/{system}/target-session/connect/start`
- `DELETE /api/projects/{project}/systems/{system}/target-session`
- `POST /api/projects/{project}/systems/{system}/attacks/dispatch` (DAST)
- `POST /api/projects/{project}/systems/{system}/attacks/dispatch/sast` (SAST)
- `GET|POST /api/projects/{project}/systems/{system}/manual-proxy/send` e CRUD `/manual-proxy/routes` (`ADMIN`, `SPECIALIST`)
- `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/{id}/read`, `POST /api/notifications/read-all`
- `GET /api/projects/{project}/systems/{system}/system-results`
- `DELETE /api/projects/{project}/systems/{system}/system-results`
- `GET /api/projects/{project}/systems/{system}/system-results/{attack_dispatch}`
- `DELETE /api/projects/{project}/systems/{system}/system-results/{attack_dispatch}`
- `POST /api/projects/{project}/systems/{system}/remediate`
- `POST /api/projects/{project}/systems/{system}/remediate/ai` (throttle 10/min)

Recursos aninhados (`project`, `system`) são resolvidos por UUID e restritos ao dono (policies).

## URLs de mídia

`cover_path` vem no formato `/storage/covers/{uuid}.ext`. Para exibir no client:

```
{ENV_CLIENT_EXAMPLE}{cover_path}
```

Exemplo: `http://127.0.0.1:8000` + `/storage/covers/abc.jpg`.

Requer `php artisan storage:link` na API.
