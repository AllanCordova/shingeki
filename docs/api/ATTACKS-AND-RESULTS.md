# API — Ataques DAST/SAST e resultados

Disparo assíncrono via RabbitMQ e consulta de achados. Voltar ao [índice da API](../API.md).

Requer workers, filas e (para DAST em laboratório) alvo vulnerável. API e stack Docker: [RUN-PROJECT.md](../RUN-PROJECT.md).

## Ambiente de laboratório

Stack, consumers e URLs de serviço: [RUN-PROJECT.md](../RUN-PROJECT.md). Vetores e credenciais do alvo: [shingeki-vulnerable-target.md](../architecture/shingeki-vulnerable-target.md).

O alvo usa a porta `VULNERABLE_TARGET_PORT` (padrão `8090`).

| Contexto | URL do alvo |
|----------|-------------|
| Navegador, popup de login | `http://127.0.0.1:8090` ou `http://localhost:8090` |
| Worker DAST (Docker) | resolvido automaticamente para `http://vulnerable-target` |
| API — manual proxy | `WorkerTargetUrlResolver::forManualProxy()` — URL do browser/lab (ver [MANUAL-PROXY.md](MANUAL-PROXY.md)) |

**Importante:** não cadastre `host.docker.internal` nem `http://vulnerable-target` como URL alvo — esses hostnames só existem dentro do Docker e quebram o navegador (`DNS_PROBE_POSSIBLE`). A API reescreve a URL ao publicar o batch na fila. Registros legados com `http://vulnerable-target` funcionam no manual proxy via reescrita automática.

### Aceite de responsabilidade

Antes de disparar ataques, o client envia o aceite no body. A API valida e grava auditoria. Contrato completo (versão, GET de status, o que foi removido): [ATTACK-ACKNOWLEDGMENT.md](ATTACK-ACKNOWLEDGMENT.md).

## POST .../attacks/dispatch (DAST)

`POST /api/projects/{project}/systems/{system}/attacks/dispatch`

Enfileira o catálogo **DAST** (`scan_type: DAST`) para o sistema. Publica na fila `attacks.dispatch`.

O lote inclui ataques cujo autor tem papel `ADMIN` ou `SPECIALIST` no catálogo global ([CATALOG.md](CATALOG.md)).

**Body (JSON):**

```json
{
  "accepted_responsibility": true,
  "accepted_legal_terms": true,
  "terms_version": "2026-07-13",
  "depth": "full",
  "start_path": "/products",
  "max_routes": 50
}
```

- `depth` (opcional): `quick` ou `full` (padrão `full` se omitido).
  - **quick**: discovery rasa no worker DAST (`MaxDepth=1`, `MaxPages=12`, sem Rod, até 20 vetores).
  - **full**: usa os limites padrão do worker (`DISCOVERY_MAX_DEPTH` / `DISCOVERY_MAX_PAGES`).
- `start_path` (opcional, DAST): rota semente do crawl (ex. `/products`). Pode ser path relativo ou URL; a API normaliza para path. O worker inicia o BFS nessa rota (mesma origem do `target_url`).
- `max_routes` (opcional, DAST): orçamento máximo de páginas visitadas no discovery (1–500). Quando `start_path` é enviado e `max_routes` é omitido, o padrão é `50`. Sobrescreve `MaxPages` do depth (incluindo quick).

Código de aceite: ver [ATTACK-ACKNOWLEDGMENT.md](ATTACK-ACKNOWLEDGMENT.md) (`AttackAcknowledgmentTerms`). Não duplicar a versão aqui.

**Resposta `202`:**

```json
{
  "message": "DAST attack catalog dispatched to processing queue.",
  "dispatch": {
    "id": "uuid",
    "system_id": "uuid",
    "user_id": "uuid",
    "scan_type": "DAST",
    "depth": "full",
    "start_path": "/products",
    "max_routes": 50,
    "attacks_count": 12,
    "dispatched_at": "...",
    "completed_at": null,
    "duration_ms": null,
    "findings_count": null,
    "status": "pending",
    "created_at": "...",
    "updated_at": "..."
  },
  "attacks_count": 12,
  "attacks": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "scan_type": "DAST",
      "category": "...",
      "target_location": "...",
      "risk_level": "...",
      "payload": "...",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

Ao receber `202`, a API cria uma notificação `attack_dispatch` com status `pending`. Quando o consumer finaliza o batch, a notificação passa para `completed` ou `failed` e o sininho no client exibe o resultado. Ver [NOTIFICATIONS.md](NOTIFICATIONS.md).

**Resposta `422`:** aceite inválido/`terms_version` desatualizada, catálogo de ataques indisponível ou erro de configuração.

No client, a profundidade (e o escopo opcional de rota no DAST) é escolhida em um modal após o clique em **Ataque DAST** / **Ataque SAST** (não no formulário principal).

## POST .../attacks/dispatch/sast (SAST)

`POST /api/projects/{project}/systems/{system}/attacks/dispatch/sast`

Enfileira o catálogo **SAST** (`scan_type: SAST`) para análise estática do `repository_url` do sistema. Publica na fila `attacks.sast.dispatch`. O worker [workers/sast](../architecture/shingeki-sast-worker.md) executa Semgrep (PHP, TypeScript, JavaScript) e publica achados na mesma fila `attacks.results` do DAST.

**Body (JSON):** igual ao dispatch DAST (aceite obrigatório + `depth` opcional). Campos `start_path` / `max_routes` podem ser persistidos, mas o worker SAST não usa escopo de crawl. No SAST, `depth` é persistido e enviado na fila, mas o worker não altera a análise estática.

**Pré-requisito:** o sistema deve ter `repository_url` preenchido (repositório Git público no MVP).

**Resposta `202`:** igual ao DAST, com `scan_type: SAST` e mensagem `SAST attack catalog dispatched to processing queue.`

**Resposta `422`:** aceite inválido, `repository_url` ausente, catálogo SAST vazio ou erro de configuração.

## GET .../system-results

`GET /api/projects/{project}/systems/{system}/system-results`

Lista dispatches do sistema (mais recentes primeiro).

**Resposta `200`:**

```json
{
  "dispatches": [
    {
      "id": "uuid",
      "system_id": "uuid",
      "scan_type": "DAST",
      "depth": "full",
      "attacks_count": 12,
      "dispatched_at": "...",
      "completed_at": "...",
      "duration_ms": 45000,
      "findings_count": 3,
      "probes_count": 40,
      "vectors_discovered": 8,
      "jobs_planned": 40,
      "status": "completed",
      "probe_counts": {
        "all": 40,
        "vulnerable": 3,
        "clean": 35,
        "error": 2
      }
    }
  ]
}
```

`status`: `pending` enquanto `completed_at` for `null`; `completed` caso contrário.

**Probes** são tentativas de payload (`dispatch_probes`), distintas dos **achados** (`system_results`). O worker DAST publica `attack.probe` para cada tentativa (`vulnerable` / `clean` / `error`) e um achado só quando a evidência confirma vulnerabilidade. Contrato da fila: [shingeki-dast-worker.md](../architecture/shingeki-dast-worker.md).

## GET .../system-results/{attack_dispatch}

Detalhe de um dispatch com achados **e** probes, ambos paginados.

**Query:**

| Param | Default | Descrição |
|-------|---------|-----------|
| `results_page` / `results_per_page` | `1` / `25` | Paginação dos achados (máx. 100) |
| `page` / `per_page` | `1` / `25` | Paginação dos probes |
| `filter` | `all` | Probes: `all`, `vulnerable`, `clean` |
| `category`, `risk_level`, `route`, `q` | — | Filtros de log (achados e probes) |

**Resposta `200`:** `{ dispatch, results, results_pagination, probes, probes_pagination, probe_counts, filter, log_filters }`

Cada achado inclui `source_file`, `start_line`, `end_line` e `matched_snippet` quando o SAST (ou o normalizador) preenche localização de código.

O parâmetro de rota é o UUID do `AttackDispatch`.

## DELETE .../system-results/{attack_dispatch}

`DELETE /api/projects/{project}/systems/{system}/system-results/{attack_dispatch}`

Remove um disparo e os `system_results` / `dispatch_probes` associados.

**Resposta `200`:**

```json
{
  "message": "Attack dispatch deleted successfully."
}
```

**Resposta `403`:** sem permissão (mesma policy de visualização do batch).

## DELETE .../system-results

`DELETE /api/projects/{project}/systems/{system}/system-results`

Remove **todos** os dispatches, achados e probes do sistema.

**Resposta `200`:**

```json
{
  "message": "All attack dispatches deleted successfully."
}
```

## GET .../system-results/compare

`GET /api/projects/{project}/systems/{system}/system-results/compare?baseline_id={uuid}&target_id={uuid}`

Compara achados de dois dispatches do mesmo sistema (fingerprint: `attack_id` + rota + arquivo/linha + payload).

**Resposta `200`:** `baseline`, `target`, `summary` (`new` / `resolved` / `persisted`) e as três listas de achados.

No client: `/projetos/.../sistemas/.../comparar`.

## GET .../system-results/{attack_dispatch}/export

`GET /api/projects/{project}/systems/{system}/system-results/{attack_dispatch}/export`

Baixa o relatório de auditoria em **PDF** (disparo precisa estar concluído). `422` se ainda estiver pendente.

No client: modal de exportação na página do dispatch.

## Exemplo com curl

```bash
curl -X POST "http://127.0.0.1:8000/api/projects/{projectId}/systems/{systemId}/attacks/dispatch" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d "{\"accepted_responsibility\":true,\"accepted_legal_terms\":true,\"terms_version\":\"2026-07-13\"}"
```

Substitua IDs após `GET /api/projects` (seed cria **Pentest Lab** / **Vulnerable PHP Target**).
