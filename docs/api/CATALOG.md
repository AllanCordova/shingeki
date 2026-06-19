# API — Catálogo global (ataques e medicações)

Gerenciamento do catálogo usado no dispatch DAST/SAST e no lookup de remediações. Voltar ao [índice da API](../API.md).

Importação em massa via CSV: [CATALOG-BULK-IMPORT.md](CATALOG-BULK-IMPORT.md).

## Papéis (`role`)

| Valor | Descrição |
|-------|-----------|
| `USER` | Usuário padrão (registro). Sem acesso às rotas `/api/catalog/*`. |
| `SPECIALIST` | Gerencia catálogo: CRUD, importação CSV e área admin no client. |
| `ADMIN` | Mesmas capacidades de catálogo que `SPECIALIST`, mais bypass de ownership (edita/remove qualquer registro). |

Rotas abaixo exigem `auth:sanctum` e middleware `role:ADMIN,SPECIALIST` (admins passam em qualquer rota com `role:*`).

## Permissões por registro

Cada item de catálogo tem `user_id` (autor). Respostas incluem `permissions.update` e `permissions.delete`:

| Papel | Próprio registro | Registro de outro |
|-------|------------------|-------------------|
| `SPECIALIST` | editar / remover | somente leitura |
| `ADMIN` | editar / remover | editar / remover |

## Ataques do catálogo

Base: `/api/catalog/attacks`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/catalog/attacks` | Lista ataques (com `author` e `permissions`) |
| POST | `/api/catalog/attacks` | Cria ataque (`user_id` = usuário autenticado) |
| GET | `/api/catalog/attacks/{attack}` | Detalhe |
| PUT | `/api/catalog/attacks/{attack}` | Atualiza (policy de ownership) |
| DELETE | `/api/catalog/attacks/{attack}` | Remove (policy de ownership) |

**Body `POST` / `PUT` (JSON):**

| Campo | Regras |
|-------|--------|
| `scan_type` | `DAST`, `SAST` |
| `category` | Categorias OWASP (`SQL_INJECTION`, `XSS`, …) |
| `target_location` | `FORM`, `QUERY_PARAMETER`, `HEADER`, … |
| `risk_level` | `LOW`, `MEDIUM`, `HIGH` |
| `payload` | Objeto JSON (estrutura varia por categoria) |

**Resposta de listagem (trecho):**

```json
{
  "attacks": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "scan_type": "DAST",
      "category": "XSS",
      "target_location": "QUERY_PARAMETER",
      "risk_level": "MEDIUM",
      "payload": { "parameter": "q", "value": "<script>alert(1)</script>" },
      "author": {
        "id": "uuid",
        "name": "Test User",
        "email": "test@example.com",
        "role": "SPECIALIST"
      },
      "permissions": { "update": true, "delete": true },
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### Uso no dispatch

O dispatch DAST/SAST enfileira apenas ataques cujo autor tem papel `ADMIN` ou `SPECIALIST` (`AttackCatalogService`). Ataques de usuários `USER` não entram no lote.

## Medicações do catálogo

Base: `/api/catalog/remediations`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/catalog/remediations` | Lista snippets (com `permissions`) |
| POST | `/api/catalog/remediations` | Cria snippet |
| GET | `/api/catalog/remediations/{remediation}` | Detalhe |
| PUT | `/api/catalog/remediations/{remediation}` | Atualiza |
| DELETE | `/api/catalog/remediations/{remediation}` | Remove |

**Body `POST` / `PUT` (JSON):**

| Campo | Regras |
|-------|--------|
| `stack_id` | UUID de stack existente ([STACKS.md](STACKS.md)) |
| `scan_type` | Opcional: `DAST`, `SAST` |
| `attack_category` | Opcional; categorias de ataque |
| `semgrep_rule_id` | Opcional; match SAST exato |
| `title`, `description`, `code_snippet` | Obrigatórios |
| `references` | Opcional; array de URLs |

Lookup em `POST .../remediate` continua descrito em [REMEDIATION.md](REMEDIATION.md).

## Erros comuns

| Status | Situação |
|--------|----------|
| `403` | Usuário `USER` ou sem permissão na policy |
| `404` | Recurso inexistente |
| `422` | Validação de campos |

## Client web

Usuários `ADMIN` e `SPECIALIST` veem a sidebar admin (`/admin`, `/admin/ataques`, `/admin/medicacoes`) com CRUD individual e painel de importação CSV.
