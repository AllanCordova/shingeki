# Shingeki

Monorepo da plataforma Shingeki: API REST em Laravel, worker DAST em Go e alvo PHP intencionalmente vulnerável para laboratório.

A API organiza projetos de segurança, cadastra sistemas-alvo, gerencia assinaturas digitais de autorização de testes e dispara varreduras DAST de forma assíncrona via filas RabbitMQ. O worker Go consome dispatches, explora o alvo e publica resultados; a API persiste os achados vinculados ao sistema testado.

## Estrutura do repositório

| Diretório | Descrição |
|-----------|-----------|
| [`shingeki-api/`](shingeki-api/) | Backend Laravel (REST, Sanctum, RabbitMQ, policies) |
| [`shingeki-dast-worker/`](shingeki-dast-worker/) | Worker Go (discovery, ataques, evidências) |
| [`shingeki-vulnerable-target/`](shingeki-vulnerable-target/) | Alvo PHP vulnerável para validação do pipeline |

**Repositório:** https://github.com/AllanCordova/shingeki

## Requisitos

- **PHP** 8.4+ e **Composer** 2.x
- **Go** 1.22+ (opcional, para desenvolvimento local do worker)
- **Docker** e **Docker Compose** (MySQL, RabbitMQ, worker e alvo)

## Configuração

1. Clone o repositório:

```bash
git clone https://github.com/AllanCordova/shingeki.git
cd shingeki
```

2. Instale as dependências PHP:

```bash
cd shingeki-api
composer install
cd ..
```

3. Crie o arquivo de ambiente na **raiz** do monorepo:

```bash
cp .env.example .env
```

4. Vincule o `.env` ao Laravel (Windows):

```powershell
New-Item -ItemType Junction -Path shingeki-api\.env -Target .env -Force
```

No Linux/macOS:

```bash
ln -sf ../.env shingeki-api/.env
```

5. Gere a chave da aplicação:

```bash
cd shingeki-api
php artisan key:generate
cd ..
```

Variáveis relevantes estão em [`.env.example`](.env.example), em especial `DB_*`, `RABBITMQ_*` e `VULNERABLE_TARGET_*`.

## Execução

### Opção A — Testes automatizados (rápido)

Os testes usam SQLite em memória; não é obrigatório subir Docker.

```bash
cd shingeki-api
composer test
```

### Opção B — API local com MySQL e RabbitMQ

```bash
docker compose up -d mysql rabbitmq
cd shingeki-api
php artisan migrate --seed
php artisan serve
php artisan queue:listen --tries=1
php artisan attacks:consume-results
```

A API fica em `http://127.0.0.1:8000` (prefixo `/api`).

### Opção C — Stack completa (DAST + alvo vulnerável)

Na raiz do monorepo:

```bash
docker compose up -d --build
cd shingeki-api
php artisan migrate --seed
php artisan serve
php artisan queue:listen --tries=1
php artisan attacks:consume-results
```

O alvo de laboratório expõe a porta `VULNERABLE_TARGET_PORT` (padrão `8090`).

## Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/auth/register` | Cadastro |
| `POST` | `/api/auth/login` | Login (token Sanctum) |
| `GET/POST/PUT/DELETE` | `/api/projects` | CRUD de projetos |
| `*` | `/api/projects/{project}/systems` | CRUD de sistemas |
| `POST` | `.../signatures/generate`, `validate`, `revoke` | Assinaturas |
| `POST` | `.../attacks/dispatch` | Disparo de ataque DAST |
| `GET` | `.../system-results` | Resultados das varreduras |

Envie `Authorization: Bearer {token}` nas rotas protegidas.

## Saúde da aplicação

```bash
curl http://127.0.0.1:8000/up
```

## Licença

Projeto acadêmico — consulte o repositório para informações de licenciamento.
