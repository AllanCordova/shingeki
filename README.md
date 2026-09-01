# Shingeki

Plataforma para detecção automatizada e remediação interativa de vulnerabilidades web.

## Arquitetura

Visão do monorepo, fluxo DAST e detalhes por pacote: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** (site: [Arquitetura](https://allancordova.github.io/shingeki/ARCHITECTURE/)).

## Estrutura do repositório

| Diretório | Descrição |
|-----------|-----------|
| [`apps/api/`](apps/api/) | Backend Laravel (REST, Sanctum, RabbitMQ, policies) |
| [`apps/client/`](apps/client/) | Frontend Next.js (BFF, React Query, autenticação) |
| [`apps/extension/`](apps/extension/) | Extensão Chrome/Edge (captura de sessão do alvo) |
| [`workers/dast/`](workers/dast/) | Worker Go DAST (discovery, ataques, evidências) |
| [`workers/sast/`](workers/sast/) | Worker Go SAST (clone + Semgrep) |
| [`labs/vulnerable-target/`](labs/vulnerable-target/) | Alvo PHP vulnerável para validação do pipeline |
| Juice Shop (Docker) | Treino DAST — [docs/architecture/shingeki-juice-shop.md](docs/architecture/shingeki-juice-shop.md) |

## Documentação

**[https://allancordova.github.io/shingeki/](https://allancordova.github.io/shingeki/)**

Fonte canônica: **[`docs/`](docs/index.md)** (cada tópico tem um arquivo dono — [fontes de verdade](docs/index.md#fontes-de-verdade)). Como subir a stack: **[docs/RUN-PROJECT.md](docs/RUN-PROJECT.md)**.

```bash
docker compose up -d          # MySQL + RabbitMQ + api-consumers
cd apps/api && php artisan serve
cd apps/client && npm run dev
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

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).
