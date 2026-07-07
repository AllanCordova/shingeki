# Shingeki

Plataforma para detecção automatizada e remediação interativa de vulnerabilidades web.

## Arquitetura

Visão do monorepo, fluxo DAST e detalhes por pacote: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** (site: [Arquitetura](https://allancordova.github.io/shingeki/ARCHITECTURE/)).

## Estrutura do repositório

| Diretório | Descrição |
|-----------|-----------|
| [`shingeki-api/`](shingeki-api/) | Backend Laravel (REST, Sanctum, RabbitMQ, policies) |
| [`shingeki-client/`](shingeki-client/) | Frontend Next.js (BFF, React Query, autenticação) |
| [`shingeki-dast-worker/`](shingeki-dast-worker/) | Worker Go (discovery, ataques, evidências) |
| [`shingeki-vulnerable-target/`](shingeki-vulnerable-target/) | Alvo PHP vulnerável para validação do pipeline |

## Documentação

**[https://allancordova.github.io/shingeki/](https://allancordova.github.io/shingeki/)**

Guia completo: **[docs/RUN-PROJECT.md](docs/RUN-PROJECT.md)**

```bash
docker compose up -d          # MySQL + RabbitMQ
cd shingeki-api && php artisan serve
cd shingeki-client && npm run dev
```

| Tópico | Arquivo no repositório |
|--------|-------------------------|
| Arquitetura | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Como rodar | [docs/RUN-PROJECT.md](docs/RUN-PROJECT.md) |
| API REST | [docs/API.md](docs/API.md) |
| Client web | [docs/WEB-DEVELOPMENT.md](docs/WEB-DEVELOPMENT.md) |
| CI | [docs/ci/overview.md](docs/ci/overview.md) |

Preview local da documentação:

```bash
pip install -r requirements-docs.txt
mkdocs serve
```

http://127.0.0.1:8001/shingeki/

## Módulos da disciplina

Módulos aplicados neste projeto (detalhes e caminhos no código): **[MODULOS-DISCIPLINA.md](MODULOS-DISCIPLINA.md)**

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).
