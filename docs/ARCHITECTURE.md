# Architecture

Visão da arquitetura do monorepo Shingeki. 

## Visão geral

```mermaid
flowchart TB
  subgraph clients [Clients]
    Web[shingeki-client\nNext.js + BFF]
    Mobile[shingeki-mobile\nExpo]
  end
  API[shingeki-api\nLaravel REST + Sanctum]
  Queue[(RabbitMQ)]
  Worker[shingeki-dast-worker\nGo]
  Target[shingeki-vulnerable-target\nPHP lab]
  Web --> API
  Mobile --> API
  API --> Queue
  Queue --> Worker
  Worker --> Target
  Worker --> Queue
  Queue --> API
```

| Pacote | Documento |
|--------|-----------|
| `shingeki-api` | [architecture/shingeki-api.md](architecture/shingeki-api.md) |
| `shingeki-client` | [architecture/shingeki-client.md](architecture/shingeki-client.md) |
| `shingeki-mobile` | [architecture/shingeki-mobile.md](architecture/shingeki-mobile.md) |
| `shingeki-dast-worker` | [architecture/shingeki-dast-worker.md](architecture/shingeki-dast-worker.md) |
| `shingeki-vulnerable-target` | [architecture/shingeki-vulnerable-target.md](architecture/shingeki-vulnerable-target.md) |

## Fluxo de um disparo DAST

1. Client (web ou mobile) chama `POST .../attacks/dispatch` na API com token de assinatura.
2. A API valida policy, assinatura e enfileira o lote em `attacks.dispatch`.
3. O worker consome o lote, descobre superfície no alvo, executa payloads e publica achados em `attacks.results`.
4. O comando `attacks:consume-results` na API persiste resultados e fecha o dispatch.
5. O client consulta `system-results` (com polling no web para dispatches pendentes).

Contratos HTTP: [API.md](API.md). Filas e payloads do worker: [architecture/shingeki-dast-worker.md](architecture/shingeki-dast-worker.md).
