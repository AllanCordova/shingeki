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

Aceita `application/json` (sem capa) ou `multipart/form-data` (com capa opcional).

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `name` | sim | máx. 255 |
| `description` | sim | texto |
| `cover` | não | arquivo imagem, máx. 5 MB (web) |
| `cover_upload_id` | não | UUID da biblioteca do usuário (web) |

Sem `cover` nem `cover_upload_id`, `cover_path` fica `null`.

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
      "login_url": "http://127.0.0.1:8090/login.php",
      "repository_url": "https://github.com/...",
      "stacks": [
        { "id": "uuid", "slug": "laravel", "name": "Laravel", "languages": ["php"] }
      ],
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### POST /api/projects/{project}/systems

Aceita `application/json` (sem capa) ou `multipart/form-data` (com capa opcional).

| Campo | Obrigatório |
|-------|-------------|
| `name` | sim |
| `target_url` | sim (URL válida) |
| `login_url` | não (URL de login do alvo; sobrescreve a usada na [sessão do alvo](TARGET-SESSION.md)) |
| `repository_url` | sim (URL válida) |
| `stack_ids` | sim (array de UUIDs; mínimo 1) — ver [STACKS.md](STACKS.md) |
| `cover` / `cover_upload_id` | não (opcional; web) |

Em `multipart/form-data`, envie `stack_ids[]` repetido por UUID.

**Resposta `201`:** `{ "message": "...", "system": { ... } }`

### GET /api/projects/{project}/systems/{system}

**Resposta `200`:** `{ "system": { ... } }`

### PUT /api/projects/{project}/systems/{system}

Campos opcionais: `name`, `target_url`, `login_url`, `repository_url`, `stack_ids` ([STACKS.md](STACKS.md)), `cover`, `cover_upload_id`.

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

## Dashboard do projeto

`GET /api/projects/{project}/dashboard`

Agrega o último disparo **concluído** de cada sistema do projeto.

**Resposta `200`:** `{ "dashboard": { ... } }`

| Campo | Significado |
|-------|-------------|
| `systems_count` | Sistemas no projeto |
| `total_findings` | Soma de `findings_count` do último dispatch concluído de cada sistema |
| `previous_total_findings` | Soma do dispatch anterior (tendência) |
| `findings_trend` | `total - previous` |
| `trend_direction` | `up` / `down` / `flat` |
| `last_dispatch` | Dispatch mais recente (qualquer status) |
| `systems_with_findings` | Sistemas cujo último dispatch concluído tem achados |

## Sistemas do usuário (lista plana)

Atalhos sem o `{project}` na URL — ainda restringidos aos sistemas dos projetos do usuário autenticado.

### GET /api/systems

Lista sistemas do usuário (`name` asc), cada um com `project: { id, name }` e campos DAST persistidos (`dast_start_path`, `dast_max_routes`).

### GET /api/systems/{system}

Detalhe do mesmo formato.

### PUT /api/systems/{system}/dispatch-settings

Persiste o escopo DAST padrão do sistema (pré-preenche o modal de disparo).

**Body (JSON):**

| Campo | Regras |
|-------|--------|
| `dast_start_path` | presente; string ou `null`; path normalizado |
| `dast_max_routes` | presente; inteiro 1–500 ou `null` |

No client: `/configuracoes/sistemas/{systemId}/dispatch`. No disparo pontual, `start_path` / `max_routes` no body ainda sobrescrevem o lote — ver [ATTACKS-AND-RESULTS.md](ATTACKS-AND-RESULTS.md).
