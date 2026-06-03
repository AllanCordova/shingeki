# Visão geral

Workflow: [`.github/workflows/ci.yml`](https://github.com/AllanCordova/shingeki/blob/main/.github/workflows/ci.yml) — dispara em **push** e **pull_request**. Hoje cobre apenas **`shingeki-api`** (PHP 8.4).

| Job | Ferramenta |
|-----|------------|
| `lint` | Laravel Pint |
| `tests` | Pest (`php artisan test`) |

## Rodar localmente (`shingeki-api`)

Com `composer install` já executado:

```bash
cd shingeki-api
composer lint
composer test
```

| Comando | Uso |
|---------|-----|
| `composer lint` | Lint (igual ao CI) |
| `composer lint:fix` | Só corrigir estilo |
| `composer test` | Testes (igual ao CI) |

## Documentação (MkDocs)

Site publicado: **https://allancordova.github.io/shingeki/**

Preview local (raiz do monorepo):

```bash
pip install -r requirements-docs.txt
mkdocs serve
```

Abre **http://127.0.0.1:8001/shingeki/**

Build local (pasta `site/`):

```bash
mkdocs build
```
