# API — Ataques DAST/SAST e resultados

Disparo assíncrono via RabbitMQ e consulta de achados. Voltar ao [índice da API](../API.md).

Requer workers, filas e (para DAST em laboratório) alvo vulnerável. API e stack Docker: [RUN-PROJECT.md](../RUN-PROJECT.md).

## Ambiente de laboratório

### Stack completa

Na raiz do monorepo:

```bash
docker compose up -d
docker compose --profile stack up -d --build
```

Em terminais separados:

```bash
cd shingeki-api
php artisan serve
```

```bash
cd shingeki-client
npm run dev
```

Os consumers Laravel (`attacks:consume-results`, `catalog:consume-imports`) rodam no container **`api-consumers`** — não é necessário executá-los no host, a menos que você opte pelo fluxo sem Docker descrito em [RUN-PROJECT.md](../RUN-PROJECT.md).

Client web: detalhes em [RUN-PROJECT.md](../RUN-PROJECT.md) e [WEB-DEVELOPMENT.md](../WEB-DEVELOPMENT.md).

O alvo de laboratório usa a porta `VULNERABLE_TARGET_PORT` (padrão `8090`).

| Contexto | URL do alvo |
|----------|-------------|
| Navegador, popup de login | `http://127.0.0.1:8090` ou `http://localhost:8090` |
| Worker DAST (Docker) | resolvido automaticamente para `http://vulnerable-target` |
| API — manual proxy | `WorkerTargetUrlResolver::forManualProxy()` — URL do browser/lab (ver [MANUAL-PROXY.md](MANUAL-PROXY.md)) |

**Importante:** nao cadastre `host.docker.internal` nem `http://vulnerable-target` como URL alvo — esses hostnames so existem dentro do Docker e quebram o navegador (`DNS_PROBE_POSSIBLE`). A API reescreve a URL ao publicar o batch na fila. Registros legados com `http://vulnerable-target` funcionam no manual proxy via reescrita automatica.

### Aceite de responsabilidade

Antes de disparar ataques, o client deve enviar no body o aceite de responsabilidade e termos legais (`accepted_responsibility`, `accepted_legal_terms`, `terms_version`). A API valida e grava auditoria em `attack_acknowledgments`. Fluxo completo: [ATTACK-ACKNOWLEDGMENT.md](ATTACK-ACKNOWLEDGMENT.md).

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
  "depth": "full"
}
```

- `depth` (opcional): `quick` ou `full` (padrão `full` se omitido).
  - **quick**: discovery rasa no worker DAST (`MaxDepth=1`, `MaxPages=12`, sem Rod, até 20 vetores).
  - **full**: usa os limites padrão do worker (`DISCOVERY_MAX_DEPTH` / `DISCOVERY_MAX_PAGES`).

Código de aceite: `SHINGEKI-ATTACK-ACK-1` (`AttackAcknowledgmentTerms`). Versão atual: `2026-07-13`.

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

No client, a profundidade é escolhida em um modal após o clique em **Ataque DAST** / **Ataque SAST** (não no formulário principal).

## POST .../attacks/dispatch/sast (SAST)

`POST /api/projects/{project}/systems/{system}/attacks/dispatch/sast`

Enfileira o catálogo **SAST** (`scan_type: SAST`) para análise estática do `repository_url` do sistema. Publica na fila `attacks.sast.dispatch`. O worker [shingeki-sast-worker](../architecture/shingeki-sast-worker.md) executa Semgrep (PHP, TypeScript, JavaScript) e publica achados na mesma fila `attacks.results` do DAST.

**Body (JSON):** igual ao dispatch DAST (aceite obrigatório + `depth` opcional). No SAST, `depth` é persistido e enviado na fila, mas o worker não altera a análise estática.

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
      "attacks_count": 12,
      "dispatched_at": "...",
      "completed_at": "...",
      "duration_ms": 45000,
      "findings_count": 3,
      "status": "completed",
      "..."
    }
  ]
}
```

`status`: `pending` enquanto `completed_at` for `null`; `completed` caso contrário.

## GET .../system-results/{attack_dispatch}

Detalhe de um dispatch com achados.

**Resposta `200`:**

```json
{
  "dispatch": { "...": "..." },
  "results": [
    {
      "id": "uuid",
      "system_id": "uuid",
      "attack_dispatch_id": "uuid",
      "attack_id": "uuid",
      "vulnerable_route": "/path",
      "payload_used": "...",
      "evidence": "...",
      "http_request": "...",
      "attack": {
        "id": "uuid",
        "category": "...",
        "target_location": "...",
        "risk_level": "..."
      },
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

O parâmetro de rota é o UUID do `AttackDispatch` (nome da rota: `attack_dispatch`).

## DELETE .../system-results/{attack_dispatch}

`DELETE /api/projects/{project}/systems/{system}/system-results/{attack_dispatch}`

Remove um disparo e todos os `system_results` associados.

**Resposta `200`:**

```json
{
  "message": "Attack dispatch deleted successfully."
}
```

**Resposta `403`:** sem permissão (mesma policy de visualização do batch).

## DELETE .../system-results

`DELETE /api/projects/{project}/systems/{system}/system-results`

Remove **todos** os dispatches e achados do sistema.

**Resposta `200`:**

```json
{
  "message": "All attack dispatches deleted successfully."
}
```

## Exemplo com curl

```bash
curl -X POST "http://127.0.0.1:8000/api/projects/{projectId}/systems/{systemId}/attacks/dispatch" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d "{\"accepted_responsibility\":true,\"accepted_legal_terms\":true,\"terms_version\":\"2026-07-13\"}"
```

Substitua IDs após `GET /api/projects` (seed cria **Pentest Lab** / **Vulnerable PHP Target**).
