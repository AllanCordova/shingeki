# Shingeki DAST Worker

Go microservice that consumes attack dispatch batches from RabbitMQ, discovers attack surface on the target, executes catalog payloads, validates evidence, and publishes confirmed findings back to Laravel.

Documentação geral e stack Docker: [README na raiz](../README.md).

## Queues

### Input: `attacks.dispatch`

```json
{
  "event": "attack.dispatch.batch",
  "system_id": "uuid",
  "user_id": "uuid",
  "target_url": "https://target.example",
  "repository_url": "https://github.com/org/repo",
  "attacks": [
    {
      "attack_id": "uuid",
      "category": "SQL_INJECTION",
      "target_location": "FORM",
      "risk_level": "HIGH",
      "payload": { "field": "email", "value": "' OR 1=1 --" }
    }
  ],
  "dispatched_at": "2026-05-28T12:00:00Z"
}
```

### Output: `attacks.results` (one message per finding)

```json
{
  "attack_id": "uuid",
  "system_id": "uuid",
  "vulnerable_route": "/login",
  "payload_used": "' OR 1=1 --",
  "evidence": "SQL error signature detected in response body",
  "http_request": "POST /login HTTP/1.1\r\n..."
}
```

## Run locally

1. Use the root `.env` (see [`.env.example`](../.env.example)) for RabbitMQ settings.
2. Start infrastructure from the monorepo root: `docker compose up -d rabbitmq`.
3. Run the worker:

```bash
go run ./cmd/worker
```

4. In Laravel, consume results:

```bash
cd ../shingeki-api
php artisan attacks:consume-results
```

## Docker

From the monorepo root:

```bash
docker compose up -d --build dast-worker
```

Set `DISCOVERY_ROD_ENABLED=true` in Docker to enable SPA discovery with headless Chromium.

## Architecture

- `internal/queue` — RabbitMQ consumer/publisher
- `internal/discovery` — BFS + Colly (static) + Rod (dynamic SPA)
- `internal/attack` — injectors + Resty worker pool
- `internal/evidence` — regex, diff, timing validators
- `internal/orchestrator` — pipeline wiring
