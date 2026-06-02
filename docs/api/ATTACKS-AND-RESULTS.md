# API — Ataques DAST e resultados

Disparo assíncrono via RabbitMQ e consulta de achados. Voltar ao [índice da API](../API.md).

Requer worker, filas e (para testes reais) alvo vulnerável. API e stack Docker: [RUN-PROJECT.md](../RUN-PROJECT.md).

## Ambiente de laboratório

### Stack completa

Na raiz do monorepo (MySQL, RabbitMQ, worker DAST e alvo vulnerável):

```bash
docker compose up -d --build
cd shingeki-api
php artisan migrate --seed
php artisan serve
php artisan queue:listen --tries=1
php artisan attacks:consume-results
```

O alvo de laboratório usa a porta `VULNERABLE_TARGET_PORT` (padrão `8090`).

| Contexto | URL do alvo |
|----------|-------------|
| Host (navegador, `php artisan serve`) | http://127.0.0.1:8090 |
| Rede Docker (worker DAST) | http://vulnerable-target |

Cadastre o sistema no app com a URL da coluna que corresponde a onde a API roda. O seed cria o projeto **Pentest Lab** e o sistema **Vulnerable PHP Target** apontando para o alvo.

### Token de assinatura

Valor de `VULNERABLE_TARGET_SIGNATURE_TOKEN` (raiz, `shingeki-api` e container do alvo). Exemplo padrão dos repositórios:

```json
{
  "signature_token": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
}
```

Fluxo de assinaturas (gerar, validar, revogar): [SIGNATURES.md](SIGNATURES.md).

## POST .../attacks/dispatch

`POST /api/projects/{project}/systems/{system}/attacks/dispatch`

Enfileira o catálogo de ataques para o sistema.

**Body (JSON):**

| Campo | Regras |
|-------|--------|
| `signature_token` | obrigatório, string, exatamente 64 caracteres |

O token deve corresponder à assinatura **permitida** (validada no HTML do alvo).

**Resposta `202`:**

```json
{
  "message": "Attack catalog dispatched to processing queue.",
  "dispatch": {
    "id": "uuid",
    "system_id": "uuid",
    "user_id": "uuid",
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

**Resposta `403`:** token de assinatura inválido ou não autorizado.

**Resposta `422`:** catálogo de ataques indisponível ou erro de configuração.

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

## Exemplo com curl

```bash
curl -X POST "http://127.0.0.1:8000/api/projects/{projectId}/systems/{systemId}/attacks/dispatch" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"signature_token": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}'
```

Substitua IDs após `GET /api/projects` (seed cria **Pentest Lab** / **Vulnerable PHP Target**).
