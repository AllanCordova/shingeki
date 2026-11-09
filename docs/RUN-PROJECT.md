# Como rodar o projeto

## Requisitos {#requisitos}

- **PHP** 8.4+ e **Composer** 2.x
- **Node.js** 20+ e **npm**
- **Docker** e **Docker Compose**

## Desenvolvimento {#desenvolvimento}

Na raiz do monorepo:

```bash
npm run dev
```

O comando cria os `.env` que ainda não existem, instala dependências, sobe MySQL, RabbitMQ, consumers e os workers (profile `stack`, com o serviço de captura) e então inicia a API e o client. Arquivos `.env` já existentes não são sobrescritos.

| Serviço | URL |
|---------|-----|
| API | `http://127.0.0.1:8000/api` |
| Client web | `http://localhost:3000` |
| RabbitMQ Management | `http://localhost:15672` (guest/guest) |
| Captura (noVNC) | `http://127.0.0.1:6080` |

Depois de mudar código dos workers, suba de novo com rebuild:

```bash
npm run dev:build
```

Para parar os containers: `npm run down`.

### O que roda onde

| Camada | Onde |
|--------|------|
| API + client | Host, pelo `npm run dev` |
| MySQL, RabbitMQ, consumers e workers DAST/SAST | Docker, profile `stack` |

### Seed {#seed}

O `npm run dev` migra o banco e não popula o catálogo. Para criar o catálogo, os usuários e o projeto Laboratório:

```bash
npm run seed
```

### Credenciais do seed {#credenciais-do-seed}

| E-mail | Senha | Perfil |
|--------|-------|--------|
| `test@example.com` | `password` | `SPECIALIST` — projeto Laboratório com quatro alvos públicos de scanner |
| `admin@admin.com` | `password` | `ADMIN` — catálogo global + o mesmo laboratório |

Para disparar ataques e ver resultados: [api/ATTACKS-AND-RESULTS.md](api/ATTACKS-AND-RESULTS.md).

### Fluxo de um disparo DAST {#fluxo-de-um-disparo-dast}

| Etapa | Quem consome/publica |
|-------|----------------------|
| 1. API enfileira o lote | publica em `attacks.dispatch` |
| 2. Worker DAST | consome `attacks.dispatch`, publica resultados em `attacks.results` |
| 3. `api-consumers` | consome `attacks.results`, grava no MySQL e marca o dispatch (sucesso → `completed_at`; falha → `failed_at`; sessão expirada → `session_expired_at`) |

O profile `stack` também sobe o serviço `capture` (Playwright, Xvfb e noVNC). O comando local em `workers/capture` não depende dele. Contrato: [TARGET-SESSION.md](api/TARGET-SESSION.md).

Se o disparo ficar **pendente** com o worker DAST rodando, verifique se `api-consumers` está ativo e se a fila `attacks.results` tem consumer:

```bash
docker logs shingeki-api-consumers --tail 30
docker exec shingeki-rabbitmq rabbitmqctl list_queues name messages consumers
```

`attacks.results` com mensagens e **0 consumers** → reinicie o container: `docker compose restart api-consumers`.

## Validar os workers {#validar-os-workers}

O worker DAST ataca o `target_url` do dispatch. Para treinar evidência e catálogo **sem** UI e **sem** alvo Docker:

```bash
npm run test:dast
```

Gabarito: [goldset DAST](architecture/shingeki-dast-goldset.md). Contrato de dispatch: [ATTACKS-AND-RESULTS.md](api/ATTACKS-AND-RESULTS.md).

O worker DAST usa a rede da máquina. Um alvo em `127.0.0.1` ou `localhost` é o da máquina, sem reescrever o host e sem mudar a porta em que o servidor escuta.

**SAST:** o worker clona o `repository_url` do sistema. Defina `GITHUB_TOKEN` no `.env` da raiz para repositórios privados. Amostras de treino: [`workers/sast/testdata/goldset/`](../workers/sast/testdata/goldset/).

### Opcionais

Não copie estes blocos para outros guias — só os nomes das variáveis e o link.

| Recurso | Onde configurar | Contrato |
|---------|-----------------|----------|
| Login Google | `GOOGLE_*` em `apps/api/.env` | [AUTHENTICATION.md](api/AUTHENTICATION.md) |
| Remediação IA / PR GitHub | `AI_*`, `GEMINI_*` / `GROQ_*`, `GITHUB_*` na API | [REMEDIATION.md](api/REMEDIATION.md) |
| Banco de imagens (Pexels) | `PEXELS_API_KEY` em `apps/client/.env.local` | [WEB-DEVELOPMENT.md](WEB-DEVELOPMENT.md) |

## Deploy para outras pessoas testarem

Client, API e workers para outras pessoas testarem: [DEPLOY.md](DEPLOY.md).

## Referência

- Testes da API: `cd apps/api && composer test`
- Testes do client: `cd apps/client && npm test`
- Contratos HTTP: [API.md](API.md)
- Client web: [WEB-DEVELOPMENT.md](WEB-DEVELOPMENT.md)
- CI: [ci/overview.md](ci/overview.md)
