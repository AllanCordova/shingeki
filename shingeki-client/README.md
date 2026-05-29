# shingeki-client

Cliente web (Next.js 16 / App Router) que consome a `shingeki-api`. Cobre todo o
fluxo da API: autenticacao, projetos, sistemas, assinatura (token), disparo de
ataques e leitura dos resultados.

## Como rodar

```bash
npm install
npm run dev
```

Configure a URL da API em `.env.local`:

```bash
API_BASE_URL=http://127.0.0.1:8000/api
```

## Arquitetura

```
app/
  (auth)/            # login e registro (rotas publicas)
  (app)/             # area autenticada (Header + paginas)
  api/               # route handlers REST (BFF) que repassam para a Laravel
proxy.ts             # protege rotas privadas (antigo "middleware" do Next)
lib/
  api/               # cliente axios (browser/server) + error-handler (PT)
  contracts/         # schemas Zod (formularios) + tipos de resposta
  hooks/             # React Query por recurso (isLoading + error expostos)
  stores/            # Zustand (tema + estado de UI)
components/
  ui/                # componentes atomicos (Button, Input, Modal, ...)
  forms/ projects/ systems/ signature/ attack/ results/
```

### Decisoes principais

- **Autenticacao**: o token Sanctum e guardado em cookie **http-only** pelas
  rotas `app/api/auth/*`. O browser nunca enxerga o token; apenas envia o cookie.
  As demais rotas `app/api/*` (BFF) leem esse cookie no servidor e repassam para
  a API Laravel com `Authorization: Bearer`.
- **Estado**:
  - Zustand para estado de UI puro (tema claro/escuro, modais, menu).
  - React Query para dados da API — `staleTime` alto para baixa volatilidade
    (projetos, sistemas) e `staleTime: 0` + polling para alta volatilidade
    (status dos disparos / resultados).
- **Formularios**: `react-hook-form` + `zodResolver`. Erros de validacao da API
  sao traduzidos e mapeados de volta para cada campo.
- **Tema**: variaveis CSS em `app/globals.css`, sobrescrevendo os tokens do
  Tailwind v4 via `@theme inline`. Os componentes usam apenas utilitarios
  baseados nessas variaveis (sem cores hard-coded). Troca de tema pelo botao no
  header.
```
