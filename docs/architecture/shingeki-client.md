# Client (`apps/client`)

Cliente web **Next.js** (App Router) que cobre autenticação (e-mail e Google), projetos, sistemas, disparo de ataques (com aceite), resultados, remediação e upload de capas. Consome a Laravel via **BFF** (`app/api/*`).

Como subir: [RUN-PROJECT.md](../RUN-PROJECT.md). Guia de desenvolvimento: [WEB-DEVELOPMENT.md](../WEB-DEVELOPMENT.md).

## Estrutura de pastas

```
app/
  (auth)/            # Login e registro
  (app)/             # Área autenticada
    projetos/        # Projetos, sistemas, resultados, comparar, gráfico, arsenal, histórico
    auditoria/       # Catálogo global (ADMIN, SPECIALIST)
    admin/           # Permissões de usuários (ADMIN)
    configuracoes/   # Navegação (GraphQL) e settings DAST do sistema
    perfil/          # Perfil e avatar
    notificacoes/
    termos/ataques/
  api/               # Route handlers — proxy REST e GraphQL para a Laravel
  conectar-alvo/     # Captura same-origin da sessão do alvo
  page.tsx           # Landing pública
proxy.ts             # Rotas privadas; `/` é pública
lib/
  api/               # Cliente HTTP + error-handler (mensagens em PT)
  contracts/         # Zod + tipos de resposta
  graphql/           # Apollo + query da sidebar
  hooks/             # React Query (e hook Apollo da navegação)
  stores/            # Zustand — tema e UI
components/
  ui/ landing/ cover/ projects/ systems/ attack/ results/
  remediation/ notifications/ manual-proxy/ catalog/ target-session/ auth/
```

## BFF (Backend for Frontend)

- O browser chama apenas rotas relativas `/api/...` do Next.js.
- Handlers leem a sessão no servidor e repassam para `API_BASE_URL` com `Authorization: Bearer`.
- GraphQL: `POST /api/graphql` → `POST {API origin}/graphql` (`forwardToGraphql`).
- Capas: `cover-uploads` (multipart) e **banco de imagens** (`cover-stock-images`) via Pexels (`PEXELS_API_KEY` no client — não passa pela Laravel).
- Upload de avatar: `PUT /api/auth/me` com multipart.

## Autenticação

- Token Sanctum em cookie **http-only** (`app/api/auth/*`).
- O browser não lê o token; cookies vão nas chamadas ao BFF.
- Google: BFF `/api/auth/google*` + OIDC na API (ID Token + nonce anti CSRF). Contrato: [AUTHENTICATION.md](../api/AUTHENTICATION.md).

## Estado e dados

| Camada | Uso |
|--------|-----|
| **Zustand** | UI pura: tema, modais, menu |
| **React Query** | Dados REST; `staleTime` alto em projetos/sistemas; polling em dispatches/resultados pendentes e no sininho |
| **Apollo** | Só sidebar: query `sidebarNavigation` e mutation `syncSidebarNavigation` |

## Formulários e erros

- `react-hook-form` + `zodResolver` alinhados a `lib/contracts/`.
- Respostas `422` mapeadas para campos via `error-handler` (português).

## Capas e mídia

- Seleção: arquivo novo (`cover`), item da biblioteca (`cover_upload_id`) ou imagem de banco (Pexels → download no BFF → upload na biblioteca).
- Exibição: `NEXT_PUBLIC_MEDIA_BASE_URL` + `cover_path` / `avatar_path` (sem sufixo `/api`).

## Tema (design system)

- Tokens em `app/globals.css` com Tailwind v4 (`@theme inline`).
- Componentes usam utilitários derivados das variáveis — sem cores fixas no JSX.
- Alternância de tema no header via Zustand.
- Landing pública (`components/landing/`) com seções claras/escuras e âncoras.

## Rotas de produto

| Fluxo | Onde |
|-------|------|
| Landing `/` | Pública; CTA para login ou área logada |
| Dispatch | Aceite por sistema + modal de profundidade (`quick`/`full`) e escopo DAST |
| Resultados | Achados + probes (filtro de outcome), gráfico, comparar dispatches, export PDF |
| Remediação | Catálogo vs IA; preview e abertura de PR no GitHub (SAST); histórico |
| Auditoria | `/auditoria/*` (`ADMIN`, `SPECIALIST`) |
| Admin | `/admin/users/permissoes` (`ADMIN`) |
| Navegação | `/configuracoes/navegacao` — preferências GraphQL da sidebar |
| Settings DAST | `/configuracoes/sistemas/.../dispatch` — `dast_start_path` / `dast_max_routes` |
| Guia inicial | Abre sozinho sem projetos se o usuário ainda não dispensou |
| Arsenal manual | `/projetos/.../sistemas/.../arsenal` |
| Notificações | Sininho no header (poll 20s) + `/notificacoes` |
| Sessão do alvo | Painel no sistema/arsenal; extensão em `apps/extension` |
