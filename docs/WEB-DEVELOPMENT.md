# Desenvolvimento — Web (Next.js)

Guia para levantar o client Next.js no navegador. Índice de clients: [CLIENTS.md](CLIENTS.md).

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

Abra http://localhost:3000 — a raiz (`/`) exibe a **landing pública**; após login, acesse `/projetos` ou use o header. Credenciais do seed: [RUN-PROJECT.md](RUN-PROJECT.md#credenciais-do-seed).

O client usa o BFF em `/api` e repassa requisições para a Laravel via `API_BASE_URL`.

## 3. Build de produção

```bash
cd shingeki-client
npm run build
npm start
```

Contratos HTTP: [API.md](API.md).

## 4. Remediação com IA (opcional)

Para testar **Sugerir com IA** no client, configure na API (`shingeki-api/.env`):

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=sua-chave
```

Alternativa Groq: `AI_PROVIDER=groq` e `GROQ_API_KEY`. Detalhes: [api/REMEDIATION.md](api/REMEDIATION.md#post-remediateai).
