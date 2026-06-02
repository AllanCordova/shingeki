# Shingeki

Plataforma para detecção automatizada e remediação interativa de vulnerabilidades web.

A API Laravel organiza projetos de segurança, sistemas-alvo, assinaturas de autorização e disparos DAST assíncronos (RabbitMQ). O worker Go explora o alvo e publica resultados; a API persiste os achados. O client Next.js e o app Expo (`shingeki-mobile`) consomem a mesma API REST.

## Arquitetura

Visão do monorepo, fluxo DAST e detalhes por pacote: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** (site: [Arquitetura](https://allancordova.github.io/shingeki/ARCHITECTURE/)).

## Estrutura do repositório

| Diretório | Descrição |
|-----------|-----------|
| [`shingeki-api/`](shingeki-api/) | Backend Laravel (REST, Sanctum, RabbitMQ, policies) |
| [`shingeki-client/`](shingeki-client/) | Frontend Next.js (BFF, React Query, autenticação) |
| [`shingeki-mobile/`](shingeki-mobile/) | App Expo / React Native (mesma API, upload de capas) |
| [`shingeki-dast-worker/`](shingeki-dast-worker/) | Worker Go (discovery, ataques, evidências) |
| [`shingeki-vulnerable-target/`](shingeki-vulnerable-target/) | Alvo PHP vulnerável para validação do pipeline |

## Documentação

Site (MkDocs Material): **[https://allancordova.github.io/shingeki/](https://allancordova.github.io/shingeki/)**

| Tópico | Arquivo no repositório |
|--------|-------------------------|
| Arquitetura | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Como rodar | [docs/RUN-PROJECT.md](docs/RUN-PROJECT.md) |
| API REST | [docs/API.md](docs/API.md) |
| Client web / mobile | [docs/WEB-DEVELOPMENT.md](docs/WEB-DEVELOPMENT.md) · [docs/MOBILE-DEVELOPMENT.md](docs/MOBILE-DEVELOPMENT.md) |
| CI | [docs/CI.md](docs/CI.md) |

Preview local: `pip install -r requirements-docs.txt` e `mkdocs serve` (abre em http://127.0.0.1:8000).

## Módulos da disciplina

Módulos aplicados neste projeto (detalhes e caminhos no código): **[MODULOS-DISCIPLINA.md](MODULOS-DISCIPLINA.md)**

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).
