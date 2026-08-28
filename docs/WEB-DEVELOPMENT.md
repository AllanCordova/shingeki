# Desenvolvimento — Web (Next.js)

Guia específico do `apps/client`. Setup da stack e seed: [RUN-PROJECT.md](RUN-PROJECT.md). Índice de clients: [CLIENTS.md](CLIENTS.md). Arquitetura: [shingeki-client.md](architecture/shingeki-client.md).

## Subir o client

Com a API em `http://127.0.0.1:8000`:

```bash
cd apps/client
npm run dev
```

Abra http://localhost:3000. Credenciais: [RUN-PROJECT.md](RUN-PROJECT.md#credenciais-do-seed).

O BFF em `/api` encaminha para a Laravel via `API_BASE_URL` em `apps/client/.env.local` (copie de `.env.example`).

## Variáveis do client

| Variável | Papel |
|----------|--------|
| `API_BASE_URL` | Origin da Laravel + `/api` (REST) |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | Origin da Laravel **sem** `/api` (capas e avatar) |
| `PEXELS_API_KEY` | Banco de imagens no BFF (`cover-stock-images`); sem chave a busca retorna `503` |
| `NEXT_PUBLIC_SHINGEKI_EXTENSION_ID` | Opcional; messaging direto com a extensão |

Google OIDC configura-se na **API** (`GOOGLE_*`), não no client. Contrato: [AUTHENTICATION.md](api/AUTHENTICATION.md).

IA e GitHub configuram-se na API. Ver [REMEDIATION.md](api/REMEDIATION.md).

## GraphQL

A sidebar usa Apollo contra `POST /api/graphql` (BFF → `POST /graphql` na Laravel). Não use GraphQL para CRUD. Desenho: [shingeki-api.md](architecture/shingeki-api.md#rest-vs-graphql).

## Build de produção

```bash
cd apps/client
npm run build
npm start
```
