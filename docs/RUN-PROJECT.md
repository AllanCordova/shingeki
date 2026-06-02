# Como rodar o projeto

Configuração mínima compartilhada pela API e pelos clientes. Depois, escolha o guia do client que for usar.

## Requisitos {#requisitos}

- **PHP** 8.4+ e **Composer** 2.x
- **Node.js** 20+ e **npm**
- **Docker** e **Docker Compose** (MySQL e RabbitMQ para ambiente local completo; opcional só para testes da API)
- **Go** 1.22+ (opcional, para desenvolver o worker fora do Docker)

## 1. Clone e dependências da API

```bash
git clone https://github.com/AllanCordova/shingeki.git
cd shingeki

cd shingeki-api
composer install
cd ..
```

## 2. Arquivos de ambiente

Na raiz do monorepo:

```bash
cp .env.example .env
cp shingeki-api/.env.example shingeki-api/.env
```

Gere a chave e o link de storage (capas em `/storage/covers`):

```bash
cd shingeki-api
php artisan key:generate
php artisan storage:link
cd ..
```

Copie também o `.env` do client que for usar (detalhes nos guias abaixo).

## 3. API em execução {#api-em-execucao}

### Só testes (sem Docker)

```bash
cd shingeki-api
composer test
```

### API local com banco e filas

```bash
docker compose up -d mysql rabbitmq
cd shingeki-api
php artisan migrate --seed
php artisan serve
php artisan queue:listen --tries=1
php artisan attacks:consume-results
```

A API fica em `http://127.0.0.1:8000` (rotas com prefixo `/api`).

### Stack completa (DAST + alvo vulnerável)

Na raiz do monorepo:

```bash
docker compose up -d --build
cd shingeki-api
php artisan migrate --seed
php artisan serve
php artisan queue:listen --tries=1
php artisan attacks:consume-results
```

Para cadastrar o alvo, disparar ataques e consultar resultados, veja [api/ATTACKS-AND-RESULTS.md](api/ATTACKS-AND-RESULTS.md).

## Credenciais do seed {#credenciais-do-seed}

Após `php artisan migrate --seed`:

| E-mail | Senha | Perfil |
|--------|-------|--------|
| `test@example.com` | `password` | Projeto **Pentest Lab** e sistema **Vulnerable PHP Target** |

## 4. Escolha o client

| Client | Guia |
|--------|------|
| **Web** (Next.js, navegador) | [WEB-DEVELOPMENT.md](WEB-DEVELOPMENT.md) |
| **Mobile** (Expo / Android) | [MOBILE-DEVELOPMENT.md](MOBILE-DEVELOPMENT.md) |

Ambos consomem a mesma API REST. Contratos HTTP e rotas: [API.md](API.md).

## Referência

- Documentação da API: [API.md](API.md)
- CI e lint antes de PR: [CI.md](CI.md)
