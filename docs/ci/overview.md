# Visão geral

Workflow: [`.github/workflows/ci.yml`](https://github.com/AllanCordova/shingeki/blob/main/.github/workflows/ci.yml) — dispara em **push** e **pull_request**.

Este arquivo descreve o que o CI **roda hoje** — não o que poderia rodar.

| Job | Ferramenta | Pasta |
|-----|------------|-------|
| `lint` | Laravel Pint | `apps/api` |
| `tests` | Pest (`php artisan test`) | `apps/api` |
| `dast-worker` | `go vet` / `go test` | `workers/dast` |

Não entram no workflow (ainda): `workers/sast`, `apps/client`, `apps/extension`.

## Rodar localmente (`apps/api`)

Com `composer install` já executado:

```bash
cd apps/api
composer lint
composer test
```

| Comando | Uso |
|---------|-----|
| `composer lint` | Lint (igual ao CI) |
| `composer lint:fix` | Só corrigir estilo |
| `composer test` | Testes (igual ao CI) |

Worker DAST: `cd workers/dast && go vet ./... && go test -race ./...`.

## Documentação (MkDocs)

Site publicado: **https://allancordova.github.io/shingeki/**

Preview local (raiz do monorepo):

```bash
pip install -r requirements-docs.txt
mkdocs serve
```

Abre **http://127.0.0.1:8001/shingeki/**

Build local (pasta `site/`, gerada e ignorada pelo git):

```bash
mkdocs build
```

Convenção de fontes únicas: [index.md](../index.md#fontes-de-verdade).
