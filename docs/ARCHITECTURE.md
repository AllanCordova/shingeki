# Architecture

Visão da arquitetura do monorepo Shingeki. Voltar ao [início](index.md).

## Visão geral

```mermaid
flowchart TB
  subgraph clients [Clients]
    Web[shingeki-client\nNext.js + BFF]
  end
  API[shingeki-api\nLaravel REST + Sanctum]
  Queue[(RabbitMQ)]
  DastWorker[shingeki-dast-worker\nGo]
  SastWorker[shingeki-sast-worker\nGo]
  Target[shingeki-vulnerable-target\nPHP lab]
  Web --> API
  API --> Queue
  Queue --> DastWorker
  Queue --> SastWorker
  DastWorker --> Target
  DastWorker --> Queue
  SastWorker --> Queue
  Queue --> API
```

| Pacote | Documento |
|--------|-----------|
| `shingeki-api` | [architecture/shingeki-api.md](architecture/shingeki-api.md) |
| `shingeki-client` | [architecture/shingeki-client.md](architecture/shingeki-client.md) |
| `shingeki-dast-worker` | [architecture/shingeki-dast-worker.md](architecture/shingeki-dast-worker.md) |
| `shingeki-sast-worker` | [architecture/shingeki-sast-worker.md](architecture/shingeki-sast-worker.md) |
| `shingeki-vulnerable-target` | [architecture/shingeki-vulnerable-target.md](architecture/shingeki-vulnerable-target.md) |

## Fluxo de um disparo DAST

1. O client web chama `POST .../attacks/dispatch` com aceite de responsabilidade (`accepted_responsibility`, `accepted_legal_terms`, `terms_version`).
2. A API valida policy e o aceite, grava `attack_acknowledgments` e enfileira o lote em `attacks.dispatch`.
3. O worker consome o lote, descobre superfície no alvo, executa payloads e publica achados em `attacks.results`.
4. O comando `attacks:consume-results` na API persiste resultados e fecha o dispatch.
5. O client consulta `system-results` (com polling para dispatches pendentes).

Contratos HTTP: [API.md](API.md). Filas e payloads do worker: [architecture/shingeki-dast-worker.md](architecture/shingeki-dast-worker.md).
