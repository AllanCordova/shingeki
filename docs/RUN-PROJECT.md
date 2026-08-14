# Como rodar o projeto

## Requisitos {#requisitos}

- **PHP** 8.4+ e **Composer** 2.x
- **Node.js** 20+ e **npm**
- **Docker** e **Docker Compose** (MySQL, RabbitMQ e workers)

## 1. Setup (primeira vez)

Na raiz do monorepo:

```bash
cp .env.example .env
cp shingeki-api/.env.example shingeki-api/.env
cp shingeki-client/.env.example shingeki-client/.env.local
```

Suba a infraestrutura e os consumers:

```bash
docker compose up -d --remove-orphans
```

Isso sobe **MySQL**, **RabbitMQ** e **`api-consumers`** (consumers Laravel: `attacks:consume-results` e `catalog:consume-imports`).

Instale e prepare a API:

```bash
cd shingeki-api
composer install
php artisan key:generate
php artisan migrate
php artisan storage:link
```

O `DatabaseSeeder` **só** carrega o catálogo (ataques, stacks, remediações). Contas de demonstração **não** entram por padrão.

Para o ambiente de lab local:

```bash
DEMO_SEED=true DEMO_USER_PASSWORD=password php artisan db:seed
```

`DEMO_SEED=true` também pode ir no `.env` da API. O entrypoint Docker (`RUN_DB_SEED`) permanece **desligado** por padrão.

Instale o client:

```bash
cd shingeki-client
npm install
```

Arquivos `.env` já existentes **não precisam ser sobrescritos** — copie só se ainda não tiver criado.

## 2. Desenvolvimento

Abra **dois terminais** na API e um no client.

**Terminal 1 — Docker (MySQL + RabbitMQ + consumers):**

```bash
docker compose up -d --remove-orphans
```

**Terminal 2 — API HTTP:**

```bash
cd shingeki-api
php artisan serve
```

**Terminal 3 — Client web:**

```bash
cd shingeki-client
npm run dev
```

| Serviço | URL |
|---------|-----|
| API | `http://127.0.0.1:8000/api` |
| Client web | `http://localhost:3000` |
| RabbitMQ Management | `http://localhost:15672` (guest/guest) |

### O que roda onde

| Camada | Onde |
|--------|------|
| API (`php artisan serve`) | Host |
| Consumers (`attacks:consume-results`, `catalog:consume-imports`) | Docker (`api-consumers`) |
| Client (`npm run dev`) | Host |
| MySQL + RabbitMQ | Docker |
| Workers DAST/SAST + alvo | Docker (profile `stack`) |

**Sem Docker para consumers** (tudo no host): use `composer dev:with-consumers` no lugar de `php artisan serve` + container.

### Workers DAST/SAST (ataques)

```bash
docker compose --profile stack up -d --build
```

Na primeira vez, ou após mudar código dos workers, use `--build`.

O alvo de laboratório fica em `http://127.0.0.1:8090` (porta `VULNERABLE_TARGET_PORT`).

### Fluxo de um disparo DAST

| Etapa | Quem consome/publica |
|-------|----------------------|
| 1. API enfileira o lote | publica em `attacks.dispatch` |
| 2. Worker DAST | consome `attacks.dispatch`, publica resultados em `attacks.results` |
| 3. `api-consumers` | consome `attacks.results`, grava no MySQL e marca o dispatch como concluído |

Se o disparo ficar **pendente** com o worker DAST rodando, verifique se `api-consumers` está ativo e se a fila `attacks.results` tem consumer:

```bash
docker logs shingeki-api-consumers --tail 30
docker exec shingeki-rabbitmq rabbitmqctl list_queues name messages consumers
```

`attacks.results` com mensagens e **0 consumers** → reinicie o container: `docker compose restart api-consumers`.

## Credenciais do seed de demonstração {#credenciais-do-seed}

Disponíveis **somente** quando `DEMO_SEED=true` e `DEMO_USER_PASSWORD` estão definidos. Sem isso, o seed cria só o catálogo; o dono interno do catálogo (`catalog-owner@shingeki.local`) **não** é conta de login.

| E-mail | Senha | Perfil |
|--------|-------|--------|
| `test@example.com` | valor de `DEMO_USER_PASSWORD` | `SPECIALIST` — **Pentest Lab** + projetos demo (Netflix, Mercado Livre, Nubank, iFood) |
| `admin@admin.com` | valor de `DEMO_USER_PASSWORD` | `ADMIN` — catálogo global + mesmos projetos demo |

Para disparar ataques e ver resultados: [api/ATTACKS-AND-RESULTS.md](api/ATTACKS-AND-RESULTS.md).

**SAST:** o worker clona o `repository_url` do sistema. Defina `GITHUB_TOKEN` no `.env` da raiz para repositórios privados.

## Referência

- Testes da API: `cd shingeki-api && composer test`
- Contratos HTTP: [API.md](API.md)
- Client web: [WEB-DEVELOPMENT.md](WEB-DEVELOPMENT.md)
- CI: [ci/overview.md](ci/overview.md)
