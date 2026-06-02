# API — Projetos e sistemas

CRUD aninhado: sistemas pertencem a um projeto do usuário autenticado. Voltar ao [índice da API](../API.md).

Capas: ver [COVERS.md](COVERS.md).

## Projetos

### GET /api/projects

Lista projetos do usuário (mais recentes primeiro).

**Resposta `200`:**

```json
{
  "projects": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "cover_path": "/storage/covers/....jpg",
      "name": "Pentest Lab",
      "description": "...",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### POST /api/projects

**Content-Type:** `multipart/form-data`

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `name` | sim | máx. 255 |
| `description` | sim | texto |
| `cover` | um dos dois | arquivo imagem, máx. 5 MB |
| `cover_upload_id` | um dos dois | UUID da biblioteca do usuário |

**Resposta `201`:**

```json
{
  "message": "Project created successfully.",
  "project": { "...": "..." }
}
```

### GET /api/projects/{project}

**Resposta `200`:** `{ "project": { ... } }`

### PUT /api/projects/{project}

**Content-Type:** `multipart/form-data`

| Campo | Descrição |
|-------|-----------|
| `name` | opcional |
| `description` | opcional |
| `cover` / `cover_upload_id` | opcional; troca a capa se enviado |

**Resposta `200`:** `{ "message": "...", "project": { ... } }`

### DELETE /api/projects/{project}

Remove o projeto, libera capas órfãs (projeto + sistemas filhos) quando não usadas em outro lugar.

**Resposta `200`:**

```json
{
  "message": "Project deleted successfully."
}
```

## Sistemas

Base: `/api/projects/{project}/systems`

### GET /api/projects/{project}/systems

**Resposta `200`:**

```json
{
  "systems": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "cover_path": "/storage/covers/....jpg",
      "name": "Vulnerable PHP Target",
      "target_url": "http://127.0.0.1:8090",
      "repository_url": "https://github.com/...",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### POST /api/projects/{project}/systems

**Content-Type:** `multipart/form-data`

| Campo | Obrigatório |
|-------|-------------|
| `name` | sim |
| `target_url` | sim (URL válida) |
| `repository_url` | sim (URL válida) |
| `cover` ou `cover_upload_id` | sim (mesmas regras do projeto) |

**Resposta `201`:** `{ "message": "...", "system": { ... } }`

### GET /api/projects/{project}/systems/{system}

**Resposta `200`:** `{ "system": { ... } }`

### PUT /api/projects/{project}/systems/{system}

Campos opcionais: `name`, `target_url`, `repository_url`, `cover`, `cover_upload_id`.

**Resposta `200`:** `{ "message": "...", "system": { ... } }`

### DELETE /api/projects/{project}/systems/{system}

Libera a capa do sistema se não estiver em uso em outro recurso do mesmo usuário.

**Resposta `200`:**

```json
{
  "message": "System deleted successfully."
}
```

## Autorização

Cada ação usa policies Laravel (`view`, `update`, `delete`, etc.). Tentativas sobre recursos de outro usuário retornam `403`.
