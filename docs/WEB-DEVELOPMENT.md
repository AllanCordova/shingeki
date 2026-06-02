# Desenvolvimento — Web (Next.js)

Guia para levantar o client Next.js no navegador.

**Pré-requisito:** API em execução — [RUN-PROJECT.md](RUN-PROJECT.md) (seções 1–3).

## Requisitos

- Itens de [RUN-PROJECT.md](RUN-PROJECT.md#requisitos)
- **Node.js** 20+ e **npm**

## 1. Configuração do client

Copie o ambiente do client:

```bash
cp shingeki-client/.env.example shingeki-client/.env.local
```

Instale dependências:

```bash
cd shingeki-client
npm install
cd ..
```

### Variáveis do client

Em `shingeki-client/.env.local`:

```bash
API_BASE_URL=http://127.0.0.1:8000/api
NEXT_PUBLIC_MEDIA_BASE_URL=http://127.0.0.1:8000
```

`NEXT_PUBLIC_MEDIA_BASE_URL` é a URL base da API **sem** `/api` — usada para exibir imagens de capa no browser.

## 2. Subir o client web

Com a API em `http://127.0.0.1:8000`, em outro terminal:

```bash
cd shingeki-client
npm run dev
```

Abra http://localhost:3000 e faça login com as credenciais do seed ([RUN-PROJECT.md](RUN-PROJECT.md#credenciais-do-seed)).

O client usa o BFF em `/api` e repassa requisições para a Laravel via `API_BASE_URL`.

## 3. Build de produção

```bash
cd shingeki-client
npm run build
npm start
```

## 4. Lint antes do PR

Ver [CI.md](CI.md) — jobs do GitHub Actions e comandos locais (`npm run lint`, `composer lint`, `composer test`).

Contratos HTTP (capas, projetos, ataques, etc.): [API.md](API.md).
