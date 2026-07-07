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

Em terminais separados na API:

```bash
cd shingeki-api
php artisan migrate --seed
php artisan serve
php artisan attacks:consume-results
php artisan catalog:consume-imports
```

Client web: `cd shingeki-client && npm run dev`. Detalhes: [RUN-PROJECT.md](../RUN-PROJECT.md).

O alvo de laboratório usa a porta `VULNERABLE_TARGET_PORT` (padrão `8090`).

| Contexto | URL do alvo |
|----------|-------------|
| Navegador, popup de login, assinatura | `http://127.0.0.1:8090` ou `http://localhost:8090` |
| Worker DAST (Docker) | resolvido automaticamente para `http://vulnerable-target` |
| API — manual proxy | `WorkerTargetUrlResolver::forManualProxy()` — URL do browser/lab (ver [MANUAL-PROXY.md](MANUAL-PROXY.md)) |

**Importante:** nao cadastre `host.docker.internal` nem `http://vulnerable-target` como URL alvo — esses hostnames so existem dentro do Docker e quebram o navegador (`DNS_PROBE_POSSIBLE`). A API reescreve a URL ao publicar o batch na fila. Registros legados com `http://vulnerable-target` funcionam no manual proxy via reescrita automatica.

### Assinatura do sistema

Antes de disparar ataques, gere e valide a assinatura do sistema (meta tag no HTML do alvo). A API resolve automaticamente o token ativo e permitido — **não é necessário enviar `signature_token` no body do dispatch**.

No alvo de laboratório, o valor da meta tag vem de `VULNERABLE_TARGET_SIGNATURE_TOKEN` (raiz, `shingeki-api` e container do alvo). Fluxo completo: [SIGNATURES.md](SIGNATURES.md).

## POST .../attacks/dispatch (DAST)

`POST /api/projects/{project}/systems/{system}/attacks/dispatch`

Enfileira o catálogo **DAST** (`scan_type: DAST`) para o sistema. Publica na fila `attacks.dispatch`.

O lote inclui ataques cujo autor tem papel `ADMIN` ou `SPECIALIST` no catálogo global ([CATALOG.md](CATALOG.md)).

**Body (JSON):** vazio (`{}`) ou omitido.

A API busca a assinatura ativa do usuário para o sistema, verifica expiração e status **permitido** (validado no HTML do alvo).

**Resposta `202`:**

```json
{
  "message": "DAST attack catalog dispatched to processing queue.",
  "dispatch": {
    "id": "uuid",
    "system_id": "uuid",
    "user_id": "uuid",
    "scan_type": "DAST",
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

**Resposta `403`:** assinatura ausente, expirada ou ainda não permitida para ataques.

Ao receber `202`, a API cria uma notificação `attack_dispatch` com status `pending`. Quando o consumer finaliza o batch, a notificação passa para `completed` ou `failed` e o sininho no client exibe o resultado. Ver [NOTIFICATIONS.md](NOTIFICATIONS.md).

**Resposta `422`:** catálogo de ataques indisponível ou erro de configuração.

## POST .../attacks/dispatch/sast (SAST)

`POST /api/projects/{project}/systems/{system}/attacks/dispatch/sast`

Enfileira o catálogo **SAST** (`scan_type: SAST`) para análise estática do `repository_url` do sistema. Publica na fila `attacks.sast.dispatch`. O worker [shingeki-sast-worker](../architecture/shingeki-sast-worker.md) executa Semgrep (PHP, TypeScript, JavaScript) e publica achados na mesma fila `attacks.results` do DAST.

**Body (JSON):** vazio, igual ao dispatch DAST.

**Pré-requisito:** o sistema deve ter `repository_url` preenchido (repositório Git público no MVP).

**Resposta `202`:** igual ao DAST, com `scan_type: SAST` e mensagem `SAST attack catalog dispatched to processing queue.`

**Resposta `422`:** `repository_url` ausente, catálogo SAST vazio ou erro de configuração.

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
  -H "Content-Type: application/json"
```

Substitua IDs após `GET /api/projects` (seed cria **Pentest Lab** / **Vulnerable PHP Target**).
