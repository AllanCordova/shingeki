# Desenvolvimento — Web (Next.js)

Guia do client Next.js. Setup inicial: [RUN-PROJECT.md](RUN-PROJECT.md). Índice de clients: [CLIENTS.md](CLIENTS.md).

## Subir o client

Com a API rodando em `http://127.0.0.1:8000`:

```bash
cd shingeki-client
npm run dev
```

Abra http://localhost:3000.

Credenciais do seed: [RUN-PROJECT.md](RUN-PROJECT.md#credenciais-do-seed).

O client usa o BFF em `/api` e repassa requisições para a Laravel via `API_BASE_URL` em `shingeki-client/.env.local` (copie de `.env.example` no setup).

## Build de produção

```bash
cd shingeki-client
npm run build
npm start
```

Contratos HTTP: [API.md](API.md).

## Remediação com IA (opcional)

Em `shingeki-api/.env`:

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=sua-chave
```

Alternativa Groq: `AI_PROVIDER=groq` e `GROQ_API_KEY`. Detalhes: [api/REMEDIATION.md](api/REMEDIATION.md#post-remediateai).
