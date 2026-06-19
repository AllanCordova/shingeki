# Shingeki

Plataforma para detecção automatizada e remediação interativa de vulnerabilidades web.

## Por onde começar

| Passo | Guia |
|-------|------|
| 1. Rodar API, Docker e seed | [Como rodar o projeto](RUN-PROJECT.md) |
| 2. Entender o monorepo | [Arquitetura](ARCHITECTURE.md) |
| 3. Desenvolver web ou mobile | [Clientes](CLIENTS.md) |
| 4. Consultar rotas HTTP | [API REST](API.md) |
| 5. Lint e testes antes do PR | [CI](ci/overview.md) |

## O que é o Shingeki

- **API Laravel** (`shingeki-api`) — projetos, sistemas, assinaturas, dispatch DAST/SAST, resultados e remediação.
- **Workers** — DAST (Go) e SAST (Semgrep) via RabbitMQ.
- **Clients** — web (Next.js) e mobile (Expo).
- **Lab** — alvo PHP vulnerável para testes locais.

Diagrama e pacotes: [Arquitetura](ARCHITECTURE.md).

Repositório: [github.com/AllanCordova/shingeki](https://github.com/AllanCordova/shingeki).
