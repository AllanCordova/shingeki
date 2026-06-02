# Integração contínua (CI)

Pipeline definido em [`.github/workflows/ci.yml`](https://github.com/AllanCordova/shingeki/blob/main/.github/workflows/ci.yml). Dispara em **push** e **pull_request** para qualquer branch.

Hoje o workflow cobre apenas **`shingeki-api`**. O client tem lint local (ESLint), mas ainda não entra no GitHub Actions.

Como rodar o projeto localmente: [RUN-PROJECT.md](RUN-PROJECT.md).

## Jobs no GitHub Actions

| Job | Nome | O que faz |
|-----|------|-----------|
| `lint` | Lint (Pint) | Instala dependências Composer, corrige estilo com Pint e em seguida verifica com `--test` |
| `tests` | Tests (Pest) | Copia `.env.example`, gera `APP_KEY` e executa `composer test` (Pest via `php artisan test`) |

Ambos usam **PHP 8.4** em `ubuntu-latest`. O diretório de trabalho padrão do workflow é `shingeki-api`.

### Fluxo resumido

```mermaid
flowchart LR
  push[push / pull_request] --> lint[lint: Pint]
  push --> tests[tests: Pest]
```

## Rodar localmente (API)

Na pasta `shingeki-api`, com `composer install` já executado:

### Lint — corrigir e verificar (igual ao CI)

```bash
cd shingeki-api
composer lint
```

Roda `pint` (corrige) e depois `pint --test` (garante que não sobrou nada).

Equivalente a:

```bash
./vendor/bin/pint
./vendor/bin/pint --test
```

### Lint — só corrigir

```bash
cd shingeki-api
composer lint:fix
```

Equivalente a `./vendor/bin/pint`.

### Testes (igual ao CI)

```bash
cd shingeki-api
composer test
```

Equivalente a `php artisan test` (suite Pest). Usa SQLite em memória nos testes; não exige Docker.

### Tudo antes de abrir PR (API)

```bash
cd shingeki-api
composer lint
composer test
```

## Rodar localmente (client)

O client **não** está no workflow atual; rode antes de enviar alterações em `shingeki-client`:

### Lint (ESLint)

```bash
cd shingeki-client
npm install
npm run lint
```

### Build de produção

```bash
cd shingeki-client
npm run build
```

## Referência rápida

| Pacote | Ferramenta | Verificar | Corrigir |
|--------|-----------|-----------|----------|
| `shingeki-api` | [Laravel Pint](https://laravel.com/docs/pint) | `composer lint` | `composer lint:fix` |
| `shingeki-api` | [Pest](https://pestphp.com/) | `composer test` | — |
| `shingeki-client` | ESLint (Next.js) | `npm run lint` | `npx eslint --fix .` |

## Cache no CI

O workflow cacheia `shingeki-api/vendor` pela chave `composer-{PHP_VERSION}-{hash do composer.lock}` para acelerar `composer install` entre execuções.

## Site de documentação (MkDocs)

Stack: [MkDocs](https://www.mkdocs.org/) 1.x + [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/). Versões fixadas em `requirements-docs.txt` (`mkdocs<2`) — o aviso no terminal sobre **MkDocs 2.0** é informativo; **não** rode `pip install --upgrade mkdocs` sem revisar essa pinagem.

Workflow [`.github/workflows/docs.yml`](https://github.com/AllanCordova/shingeki/blob/main/.github/workflows/docs.yml): em **push** em `main` que altere `docs/`, `mkdocs.yml` ou `requirements-docs.txt`, publica o site em **GitHub Pages** (`mkdocs gh-deploy` → branch `gh-pages`).

URL: **https://allancordova.github.io/shingeki/**

### Preview local

Na raiz do monorepo:

```bash
pip install -r requirements-docs.txt
mkdocs serve
```

Abre http://127.0.0.1:8000 (hot-reload ao editar arquivos em `docs/`).

Build estático sem publicar:

```bash
mkdocs build
# saída em site/ (ignorada pelo git)
```

Na primeira vez no GitHub: **Settings → Pages → Source: Deploy from branch → `gh-pages` / `/ (root)`**.

## Ampliar o pipeline (futuro)

Candidatos naturais para novos jobs no mesmo `ci.yml`:

- `npm run lint` e `npm run build` em `shingeki-client`
- `go test` / `golangci-lint` em `shingeki-dast-worker`
