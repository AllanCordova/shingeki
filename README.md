# Shingeki

Plataforma para detecção automatizada e remediação interativa de vulnerabilidades web.

## Estrutura do repositório

| Diretório | Descrição |
|-----------|-----------|
| [`shingeki-api/`](shingeki-api/) | Backend Laravel (REST, Sanctum, RabbitMQ, policies) |
| [`shingeki-client/`](shingeki-client/) | Frontend Next.js (BFF, React Query, autenticação) |
| [`shingeki-mobile/`](shingeki-mobile/) | App Expo / React Native (mesma API, upload de capas) |
| [`shingeki-dast-worker/`](shingeki-dast-worker/) | Worker Go (discovery, ataques, evidências) |
| [`shingeki-vulnerable-target/`](shingeki-vulnerable-target/) | Alvo PHP vulnerável para validação do pipeline |

## Documentação

### API REST

[docs/API.md](docs/API.md) — visão geral, autenticação, erros, índice de rotas e links para os guias por módulo (`docs/api/`).

### Como rodar o projeto

[docs/RUN-PROJECT.md](docs/RUN-PROJECT.md) — configuração essencial da API e links para o client **web** ou **mobile**.

### Integração contínua

[docs/CI.md](docs/CI.md) — pipeline no GitHub Actions (Pint, Pest) e comandos locais equivalentes.

## Módulos da disciplina

Módulos aplicados neste projeto (detalhes e caminhos no código): **[MODULOS-DISCIPLINA.md](MODULOS-DISCIPLINA.md)**

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).
