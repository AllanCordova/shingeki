# API REST (Laravel)

Backend em [`shingeki-api/`](../shingeki-api/). Todas as rotas abaixo usam o prefixo **`/api`**.

**Base URL local:** `http://127.0.0.1:8000/api`

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
| `403` | Sem permissão (policy) ou token de assinatura não autorizado no dispatch |
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

| Módulo | Guia |
|--------|------|
| Autenticação | [api/AUTHENTICATION.md](api/AUTHENTICATION.md) |
| Projetos e sistemas | [api/PROJECTS-AND-SYSTEMS.md](api/PROJECTS-AND-SYSTEMS.md) |
| Capas e biblioteca | [api/COVERS.md](api/COVERS.md) |
| Assinaturas digitais | [api/SIGNATURES.md](api/SIGNATURES.md) |
| Ataques DAST e resultados | [api/ATTACKS-AND-RESULTS.md](api/ATTACKS-AND-RESULTS.md) |

## Índice de rotas

### Públicas

- `POST /api/auth/register`
- `POST /api/auth/login`

### Protegidas (`auth:sanctum`)

- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `GET /api/cover-uploads`
- `DELETE /api/cover-uploads/{coverUpload}`
- `GET|POST /api/projects`
- `GET|PUT|DELETE /api/projects/{project}`
- `GET|POST /api/projects/{project}/systems`
- `GET|PUT|DELETE /api/projects/{project}/systems/{system}`
- `POST /api/projects/{project}/systems/{system}/signatures/generate`
- `POST /api/projects/{project}/systems/{system}/signatures/validate`
- `POST /api/projects/{project}/systems/{system}/signatures/revoke`
- `POST /api/projects/{project}/systems/{system}/attacks/dispatch` (DAST)
- `POST /api/projects/{project}/systems/{system}/attacks/dispatch/sast` (SAST)
- `GET /api/projects/{project}/systems/{system}/system-results`
- `GET /api/projects/{project}/systems/{system}/system-results/{attack_dispatch}`

Recursos aninhados (`project`, `system`) são resolvidos por UUID e restritos ao dono (policies).

## URLs de mídia

`cover_path` vem no formato `/storage/covers/{uuid}.ext`. Para exibir no client:

```
{ENV_CLIENT_EXAMPLE}{cover_path}
```

Exemplo: `http://127.0.0.1:8000` + `/storage/covers/abc.jpg`.

Requer `php artisan storage:link` na API.
