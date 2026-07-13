# Catalog bulk import (CSV)

Administradores (`ADMIN`) e especialistas (`SPECIALIST`) podem importar ataques e medicacoes em massa via planilha CSV (maximo **200 linhas** por upload). O processamento e assincrono via RabbitMQ.

Voltar ao [indice da API](../API.md). CRUD individual e papeis: [CATALOG.md](CATALOG.md).

## Filas RabbitMQ

| Fila | Proposito |
|------|-----------|
| `catalog.attacks.import` | Lotes de ataques do catalogo |
| `catalog.remediations.import` | Lotes de medicacoes do catalogo |

Variaveis de ambiente:

```env
RABBITMQ_CATALOG_ATTACKS_IMPORT_QUEUE=catalog.attacks.import
RABBITMQ_CATALOG_REMEDIATIONS_IMPORT_QUEUE=catalog.remediations.import
CATALOG_IMPORT_MAX_ROWS=200
CATALOG_IMPORT_CHUNK_SIZE=50
```

## Consumer

No setup padrão com Docker, o consumer roda no container **`api-consumers`** (`catalog:consume-imports`).

Alternativa no host (sem Docker para consumers):

```bash
php artisan catalog:consume-imports
```

## Endpoints (ADMIN, SPECIALIST)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/catalog/attacks/import/template` | Baixa template CSV de ataques |
| POST | `/api/catalog/attacks/import` | Envia CSV (`file`) |
| GET | `/api/catalog/remediations/import/template` | Baixa template CSV de medicacoes |
| POST | `/api/catalog/remediations/import` | Envia CSV (`file`) |
| GET | `/api/catalog/imports/{id}` | Status do import (apenas do proprio usuario) |

Resposta de upload aceito: `202` com objeto `import` (`PENDING` → `PROCESSING` → `COMPLETED` ou `FAILED`).

Ao enfileirar, a API cria notificação `catalog_import` (`pending`); ao concluir o último chunk (ou falhar na validação), o status passa para `completed` ou `failed`. Ver [NOTIFICATIONS.md](NOTIFICATIONS.md).

Erros de validacao por linha: `422` com `validation_errors` (`row`, `messages`).

## Template de ataques

Colunas (header obrigatorio):

| Coluna | Obrigatorio | Valores aceitos |
|--------|-------------|-----------------|
| `scan_type` | sim | `DAST`, `SAST` |
| `category` | sim | `SQL_INJECTION`, `XSS`, `CSRF`, `COMMAND_INJECTION`, `PATH_TRAVERSAL`, `SSRF`, `XXE`, `LDAP_INJECTION`, `NOSQL_INJECTION`, `IDOR` |
| `target_location` | sim | `FORM`, `QUERY_PARAMETER`, `HEADER`, `COOKIE`, `JSON_BODY`, `URL_PATH`, `FILE_UPLOAD`, `API_ENDPOINT`, `SOURCE_CODE` |
| `risk_level` | sim | `LOW`, `MEDIUM`, `HIGH` |
| `payload_json` | sim | Objeto JSON (ex.: `{"parameter":"q","value":"<script>alert(1)</script>"}`) |

Exemplo:

```csv
scan_type,category,target_location,risk_level,payload_json
DAST,XSS,QUERY_PARAMETER,MEDIUM,"{""parameter"":""q"",""value"":""<script>alert(1)</script>""}"
```

## Template de medicacoes

| Coluna | Obrigatorio | Valores aceitos |
|--------|-------------|-----------------|
| `stack_slug` | sim | Slug existente em `/api/stacks` (ex.: `vanilla_php`, `laravel`, `express`, `react`) |
| `scan_type` | nao | `DAST`, `SAST` ou vazio |
| `attack_category` | nao | Mesmas categorias de ataque ou vazio |
| `semgrep_rule_id` | nao | ID da regra Semgrep (SAST) |
| `title` | sim | Titulo da medicacao |
| `description` | sim | Descricao |
| `code_snippet` | sim | Script de mitigacao |
| `references` | nao | URLs separadas por `\|`, `;` ou `,` |

Exemplo:

```csv
stack_slug,scan_type,attack_category,semgrep_rule_id,title,description,code_snippet,references
vanilla_php,DAST,PATH_TRAVERSAL,,"Restringir leitura","Valide com realpath()","$resolved = realpath($path);",https://owasp.org/www-community/attacks/Path_Traversal
```

## Formato do arquivo

- Extensao: `.csv` (UTF-8)
- Primeira linha: header exato conforme template
- Linhas em branco sao ignoradas
- Maximo 200 linhas de dados por upload

## Ownership

Registros importados ficam com `user_id` de quem fez o upload. Admins podem editar/remover qualquer item do catalogo; especialistas so os proprios.

## Mensagem na fila

```json
{
  "event": "catalog.attacks.import.batch",
  "import_id": "uuid",
  "user_id": "uuid",
  "items": [ { "scan_type": "DAST", "category": "XSS", "...": "..." } ],
  "chunk_index": 0,
  "chunk_total": 1,
  "queued_at": "2026-06-19T12:00:00+00:00"
}
```

Medicacoes usam `event: catalog.remediations.import.batch` na fila `catalog.remediations.import`.
