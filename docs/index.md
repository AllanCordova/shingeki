# Shingeki

Plataforma para detecção automatizada e remediação interativa de vulnerabilidades web.

## Por onde começar

| Passo | Guia |
|-------|------|
| 1. Rodar API, client e Docker | [Como rodar o projeto](RUN-PROJECT.md) |
| 2. Entender o monorepo | [Arquitetura](ARCHITECTURE.md) |
| 3. Desenvolver o client web | [Clientes](CLIENTS.md) |
| 4. Consultar rotas HTTP | [API REST](API.md) |
| 5. Lint e testes antes do PR | [CI](ci/overview.md) |

## O que é o Shingeki

- **API Laravel** (`apps/api`) — REST com Sanctum; GraphQL (Lighthouse) só na sidebar; dispatch DAST/SAST com aceite, resultados, probes, remediação e PR no GitHub.
- **Workers** — DAST (Go) e SAST (Semgrep) via RabbitMQ.
- **Client web** — Next.js com BFF (cookie http-only) e Apollo na navegação.

Diagrama e pacotes: [Arquitetura](ARCHITECTURE.md).

Repositório: [github.com/AllanCordova/shingeki](https://github.com/AllanCordova/shingeki).

## Fontes de verdade

A documentação canônica vive em `docs/` (este site). Cada tópico tem **um** arquivo dono; os demais só apontam para ele — não reescreva o mesmo procedimento, contrato ou lista de credenciais em outro lugar.

| Tópico | Fonte única |
|--------|-------------|
| Como subir o monorepo | [RUN-PROJECT.md](RUN-PROJECT.md) |
| Deploy para testes (sem labs) | [DEPLOY.md](DEPLOY.md) |
| Visão do monorepo e fluxo DAST | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Desenho de cada pacote | [architecture/](ARCHITECTURE.md) |
| Índice de rotas HTTP | [API.md](API.md) |
| Contrato HTTP de um módulo | `docs/api/<módulo>.md` |
| Papéis (`USER` / `SPECIALIST` / `ADMIN`) | [AUTHENTICATION.md](api/AUTHENTICATION.md) |
| Aceite de responsabilidade no dispatch | [ATTACK-ACKNOWLEDGMENT.md](api/ATTACK-ACKNOWLEDGMENT.md) |
| Login do scanner (DAST autenticado) | [TARGET-SESSION.md](api/TARGET-SESSION.md) |
| Gabarito DAST (fixtures in-process) | [shingeki-dast-goldset.md](architecture/shingeki-dast-goldset.md) |
| Como validar workers | [RUN-PROJECT.md](RUN-PROJECT.md#validar-os-workers) |
| Jobs do CI | [ci/overview.md](ci/overview.md) |

O que **não** compete com estes guias:

- READMEs em `apps/` e `workers/` — ponteiros para `docs/`.
- `AGENT/` — regras para o agente de código; não entra no MkDocs.
- README da raiz — cartão de visita do repositório; aponta para cá.
