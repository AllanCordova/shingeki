# Architecture

Visão da arquitetura do monorepo Shingeki. Voltar ao [início](index.md).

Como subir a stack: [RUN-PROJECT.md](RUN-PROJECT.md). Contratos HTTP: [API.md](API.md).

## Visão geral

```mermaid
flowchart TB
  subgraph clients [Clients]
    Web["apps/client\nNext.js + BFF"]
  end
  API["apps/api\nLaravel REST + GraphQL"]
  Queue[(RabbitMQ)]
  DastWorker["workers/dast\nGo"]
  SastWorker["workers/sast\nGo"]
  Web --> API
  API --> Queue
  Queue --> DastWorker
  Queue --> SastWorker
  DastWorker --> Queue
  SastWorker --> Queue
  Queue --> API
```

O browser fala só com o BFF (`apps/client/app/api/*`). O token Sanctum fica em cookie http-only; o BFF encaminha Bearer para a Laravel. GraphQL (`POST /graphql`) entra pelo BFF em `/api/graphql` e hoje cobre só a sidebar.

O worker DAST ataca o `target_url` do dispatch — qualquer origem autorizada no sistema. Treino de evidência: [goldset in-process](architecture/shingeki-dast-goldset.md).

| Pacote | Documento |
|--------|-----------|
| `apps/api` | [architecture/shingeki-api.md](architecture/shingeki-api.md) |
| `apps/client` | [architecture/shingeki-client.md](architecture/shingeki-client.md) |
| `workers/dast` | [architecture/shingeki-dast-worker.md](architecture/shingeki-dast-worker.md) |
| `workers/sast` | [architecture/shingeki-sast-worker.md](architecture/shingeki-sast-worker.md) |
| Goldset DAST | [architecture/shingeki-dast-goldset.md](architecture/shingeki-dast-goldset.md) |

## Fluxo do operador

O mesmo catálogo atende qualquer quantidade de sistemas. A correção não é genérica para o projeto: ela sai da stack cadastrada naquele sistema.

```mermaid
flowchart TB
  projeto[Projeto]
  s1[Sistema A]
  s2[Sistema B]
  sN[Sistema N]
  catalogo[Catálogo de ataques]
  fila[(RabbitMQ)]
  dast[Worker DAST]
  sast[Worker SAST]
  achado[Achado persistido]
  snippet[Snippet literal da stack]
  projeto --> s1
  projeto --> s2
  projeto --> sN
  s1 --> catalogo
  s2 --> catalogo
  sN --> catalogo
  catalogo --> fila
  fila --> dast
  fila --> sast
  dast --> achado
  sast --> achado
  achado --> snippet
```

## Fluxo de um disparo DAST

1. O client chama `POST .../attacks/dispatch` com aceite (`accepted_responsibility`, `accepted_legal_terms`, `terms_version`).
2. A API valida policy e o aceite, grava `attack_acknowledgments` e enfileira o lote em `attacks.dispatch`. O DAST autenticado nasce antes, em `POST .../session-captures`: o `complete` cifra a sessão e só então cria o disparo, com `auth.type=browser_state`.
3. O worker descobre superfície, executa payloads, publica **probes** (`attack.probe`) e **achados** (`attack.result`) em `attacks.results`, e fecha com `attack.dispatch.completed` (`completed`, `failed` ou `session_expired`).
4. O comando `attacks:consume-results` persiste probes/`SystemResult`. Sucesso grava `completed_at`; falha grava `failed_at`; sessão expirada grava `session_expired_at`.
5. O client consulta `system-results` (polling enquanto o dispatch está pendente).

Quem publica/consome em Docker: [RUN-PROJECT.md](RUN-PROJECT.md#fluxo-de-um-disparo-dast). Filas e payloads: [architecture/shingeki-dast-worker.md](architecture/shingeki-dast-worker.md). HTTP: [api/ATTACKS-AND-RESULTS.md](api/ATTACKS-AND-RESULTS.md).
