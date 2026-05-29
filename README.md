# Shingeki

Plataforma web voltada para a detecção automatizada e a remediação interativa de vulnerabilidades web

A API organiza projetos de segurança, cadastra sistemas-alvo, gerencia assinaturas digitais de autorização de testes e dispara varreduras DAST de forma assíncrona via filas RabbitMQ. O worker Go consome dispatches, explora o alvo e publica resultados; a API persiste os achados vinculados ao sistema testado.

## Estrutura do repositório

| Diretório | Descrição |
|-----------|-----------|
| [`shingeki-api/`](shingeki-api/) | Backend Laravel (REST, Sanctum, RabbitMQ, policies) |
| [`shingeki-client/`](shingeki-client/) | Frontend Next.js (BFF, React Query, autenticação) |
| [`shingeki-dast-worker/`](shingeki-dast-worker/) | Worker Go (discovery, ataques, evidências) |
| [`shingeki-vulnerable-target/`](shingeki-vulnerable-target/) | Alvo PHP vulnerável para validação do pipeline |

## Módulos da disciplina

Na implementação deste projeto foram aplicados os seguintes módulos (detalhes, artefatos e caminhos no código):

1. **07 — Forms e Validação de Requisições**
2. **08 — Autenticação de Usuários**
3. **09 — Migrações e Relacionamentos**
4. **10 — Integridade e Integração**
5. **11 — Autorização com Policies e Testes de Feature**

Módulos da disciplina utilizados: **[MODULOS-DISCIPLINA.md](MODULOS-DISCIPLINA.md)**

## Requisitos

- **PHP** 8.4+ e **Composer** 2.x
- **Node.js** 20+ e **npm** (client Next.js)
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

3. Copie os arquivos de ambiente:

```bash
cp .env.example .env
cp shingeki-api/.env.example shingeki-api/.env
cp shingeki-dast-worker/.env.example shingeki-dast-worker/.env
cp shingeki-client/.env.example shingeki-client/.env.local
```

4. Gere a chave da aplicação:

```bash
cd shingeki-api
php artisan key:generate
cd ..
```

5. Instale as dependências do client:

```bash
cd shingeki-client
npm install
cd ..
```

## Usuários do seed

Após `php artisan migrate --seed`, use estas credenciais no login do app ou na API:

| E-mail | Senha | Perfil |
|--------|-------|--------|
| `test@example.com` | `password` | Usuário com projetos e sistemas de exemplo |

O seed também cria o projeto **Pentest Lab** e o sistema **Vulnerable PHP Target** no usuário `test@example.com`.

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

| Contexto | URL do alvo |
|----------|-------------|
| Host (navegador, API com `php artisan serve`) | http://127.0.0.1:8090 |
| Rede Docker (`docker compose`, worker DAST) | http://vulnerable-target |

Cadastre o sistema no app com a URL da coluna que corresponde a onde a API e o worker rodam. O `migrate --seed` cria o projeto **Pentest Lab** e o sistema **Vulnerable PHP Target** já apontando para o alvo.

O token de assinatura é o valor de `VULNERABLE_TARGET_SIGNATURE_TOKEN` (mesmo nos `.env` da **raiz** e de **`shingeki-api`**; o container do alvo também usa esse valor). Com o exemplo padrão dos repositórios:

```json
{
  "signature_token": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
}
```

Dispare o ataque com `POST /api/projects/{projectId}/systems/{systemId}/attacks/dispatch` (substitua os IDs; após o seed, busque-os em `GET /api/projects`). Envie o JSON acima no body e `Authorization: Bearer {token}` no header.

### Client (Next.js)

Com a API rodando (`php artisan serve` em `http://127.0.0.1:8000`), em outro terminal:

```bash
cd shingeki-client
npm run dev
```

O app abre em http://localhost:3000. Faça login com `test@example.com` / `password`.

O client usa o BFF em `/api` e aponta para a API Laravel via `API_BASE_URL` em `shingeki-client/.env.local` (padrão `http://127.0.0.1:8000/api`).

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

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).
