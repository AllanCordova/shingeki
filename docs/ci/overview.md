# Visão geral

Workflow: [`.github/workflows/ci.yml`](https://github.com/AllanCordova/shingeki/blob/main/.github/workflows/ci.yml) — dispara em **push** e **pull_request**. Hoje cobre apenas **`shingeki-api`** (PHP 8.4).

| Job | Ferramenta |
|-----|------------|
| `lint` | Laravel Pint |
| `analyse` | Larastan / PHPStan (nível 5) |
| `tests` | Pest com cobertura mínima de 40% (`composer test:coverage`) |
| `queue-integration` | Publishers/consumers contra RabbitMQ real (`tests/Integration`) |

A suíte padrão (`composer test`) usa SQLite em memória e `QUEUE_CONNECTION=sync`. Os testes de fila ficam em `tests/Integration` e só rodam no job dedicado (ou localmente com `RABBITMQ_INTEGRATION=true`).

## Rodar localmente (`shingeki-api`)

Com `composer install` já executado:

```bash
cd shingeki-api
composer lint
composer analyse
composer test
composer test:coverage
```

Fila real (RabbitMQ local):

```bash
RABBITMQ_INTEGRATION=true php vendor/bin/pest tests/Integration
```

| Comando | Uso |
|---------|-----|
| `composer lint` | Lint (igual ao CI) |
| `composer lint:fix` | Só corrigir estilo |
| `composer analyse` | Análise estática (Larastan) |
| `composer test` | Testes unitários/feature (igual ao job `tests`, sem cobertura) |
| `composer test:coverage` | Testes com limite de cobertura |

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
