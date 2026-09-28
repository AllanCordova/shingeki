# Como rodar o projeto

## Requisitos {#requisitos}

- **PHP** 8.4+ e **Composer** 2.x
- **Node.js** 20+ e **npm**
- **Docker** e **Docker Compose** (MySQL, RabbitMQ e consumers)

## 1. Setup (primeira vez)

Na raiz do monorepo:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/client/.env.example apps/client/.env.local
```

Suba a infraestrutura (MySQL, RabbitMQ e `api-consumers`):

```bash
docker compose up -d --remove-orphans
```

Instale dependências e prepare a API:

```bash
npm install
npm install --prefix apps/client
cd apps/api
composer install
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
```

Arquivos `.env` já existentes **não precisam ser sobrescritos** — copie só se ainda não tiver criado.

## 2. Desenvolvimento {#desenvolvimento}

Na raiz, um comando sobe API e client juntos (`concurrently`):

```bash
docker compose up -d --remove-orphans
npm run dev
```

| Serviço | URL |
|---------|-----|
| API | `http://127.0.0.1:8000/api` |
| Client web | `http://localhost:3000` |
| RabbitMQ Management | `http://localhost:15672` (guest/guest) |

Scripts da raiz (`package.json`): `dev` (API + client), `dev:api`, `dev:client`. Para só o client, veja [WEB-DEVELOPMENT.md](WEB-DEVELOPMENT.md).

### O que roda onde

| Camada | Onde |
|--------|------|
| API + client (`npm run dev`) | Host |
| Consumers (`attacks:consume-results`, `catalog:consume-imports`) | Docker (`api-consumers`) |
| MySQL + RabbitMQ | Docker |
| Workers DAST/SAST | Docker, profile `stack` — opcional, só para disparar scans |
| Labs de treino | Docker, profile `labs` — opcional, só para validar workers |

**Sem Docker para consumers** (tudo no host): use `composer dev:with-consumers` em `apps/api` no lugar do `dev:api` do `npm run dev`.

### Workers DAST/SAST (ataques na UI)

Os workers **não** dependem dos labs. Eles atacam o `target_url` do sistema cadastrado.

```bash
docker compose --profile stack up -d --build
```

Na primeira vez, ou após mudar código dos workers, use `--build`.

### Fluxo de um disparo DAST {#fluxo-de-um-disparo-dast}

| Etapa | Quem consome/publica |
|-------|----------------------|
| 1. API enfileira o lote | publica em `attacks.dispatch` |
| 2. Worker DAST | consome `attacks.dispatch`, publica resultados em `attacks.results` |
| 3. `api-consumers` | consome `attacks.results`, grava no MySQL e marca o dispatch (sucesso → `completed_at`; falha → `failed_at`) |

Se o disparo ficar **pendente** com o worker DAST rodando, verifique se `api-consumers` está ativo e se a fila `attacks.results` tem consumer:

```bash
docker logs shingeki-api-consumers --tail 30
docker exec shingeki-rabbitmq rabbitmqctl list_queues name messages consumers
```

`attacks.results` com mensagens e **0 consumers** → reinicie o container: `docker compose restart api-consumers`.

## 3. Validar os workers {#validar-os-workers}

O worker DAST ataca o `target_url` do dispatch. Para treinar evidência e catálogo **sem** UI e **sem** alvo Docker:

```bash
npm run test:dast
```

Gabarito: [goldset DAST](architecture/shingeki-dast-goldset.md). Contrato de dispatch: [ATTACKS-AND-RESULTS.md](api/ATTACKS-AND-RESULTS.md).

Quando o worker corre em Docker contra um alvo no host, a API reescreve `127.0.0.1` / `localhost` para `host.docker.internal` (`ATTACKS_TARGET_LOCALHOST_REWRITE` / `TARGET_LOCALHOST_REWRITE`). Cadastre só URLs de browser (`127.0.0.1`), nunca `host.docker.internal`.

**SAST:** o worker clona o `repository_url` do sistema. Defina `GITHUB_TOKEN` no `.env` da raiz para repositórios privados. Amostras de treino: [`workers/sast/testdata/goldset/`](../workers/sast/testdata/goldset/).

## Credenciais do seed {#credenciais-do-seed}

| E-mail | Senha | Perfil |
|--------|-------|--------|
| `test@example.com` | `password` | `SPECIALIST` — projetos demo (Netflix, Mercado Livre, Nubank, iFood) |
| `admin@admin.com` | `password` | `ADMIN` — catálogo global + mesmos projetos demo |

Para disparar ataques e ver resultados: [api/ATTACKS-AND-RESULTS.md](api/ATTACKS-AND-RESULTS.md).

### Opcionais

Não copie estes blocos para outros guias — só os nomes das variáveis e o link.

| Recurso | Onde configurar | Contrato |
|---------|-----------------|----------|
| Login Google | `GOOGLE_*` em `apps/api/.env` | [AUTHENTICATION.md](api/AUTHENTICATION.md) |
| Remediação IA / PR GitHub | `AI_*`, `GEMINI_*` / `GROQ_*`, `GITHUB_*` na API | [REMEDIATION.md](api/REMEDIATION.md) |
| Banco de imagens (Pexels) | `PEXELS_API_KEY` em `apps/client/.env.local` | [WEB-DEVELOPMENT.md](WEB-DEVELOPMENT.md) |

## Deploy para outras pessoas testarem

Client, API e workers, sem os labs: [DEPLOY.md](DEPLOY.md).

## Referência

- Testes da API: `cd apps/api && composer test`
- Testes do client: `cd apps/client && npm test`
- Contratos HTTP: [API.md](API.md)
- Client web: [WEB-DEVELOPMENT.md](WEB-DEVELOPMENT.md)
- CI: [ci/overview.md](ci/overview.md)
