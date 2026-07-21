# shingeki-client

Cliente web **Next.js** (App Router) que cobre autenticação, projetos, sistemas, disparo de ataques (com aceite), resultados e upload de capas. Consome a API Laravel via **BFF** (`app/api/*`).

## Estrutura de pastas

```
app/
  (auth)/            # Login e registro (rotas públicas)
  (app)/             # Área autenticada (header + páginas de projetos/sistemas/resultados)
  api/               # Route handlers REST — proxy para a Laravel
  page.tsx           # Landing pública (/) com seções de produto
proxy.ts             # Proteção de rotas privadas; `/` é pública
lib/
  api/               # Cliente HTTP (browser/servidor) + error-handler (mensagens em PT)
  contracts/         # Schemas Zod (formulários) + tipos de resposta da API (incl. aceite de ataque)
  hooks/             # React Query (auth, projects, systems, attack, results, notifications, manual-proxy, …)
  catalog/           # list-query compartilhado para admin de catálogo
  stores/            # Zustand — tema e estado de UI
components/
  ui/                # Primitivos (Button, Input, Modal, DatePicker, CoverUpload, CoverLibraryPicker, …)
  forms/             # Project, System, CoverFields, login/register
  landing/           # Página inicial pública (seções, nav, scroll)
  projects/ systems/ attack/ results/ remediation/ notifications/ manual-proxy/
```

## BFF (Backend for Frontend)

- O browser chama apenas rotas relativas `/api/...` do Next.js.
- Handlers em `app/api/` leem sessão no servidor e repassam para `API_BASE_URL` (Laravel) com `Authorization: Bearer`.
- Upload de capas: rotas BFF dedicadas (`cover-uploads`) repassam `multipart/form-data` sem expor a URL da API ao bundle do cliente.

## Autenticação

- Token Sanctum guardado em cookie **http-only** pelas rotas `app/api/auth/*`.
- O browser não acessa o token em JavaScript; cookies vão automaticamente nas chamadas ao BFF.
- Demais rotas `app/api/*` leem o cookie no servidor e montam o header Bearer para a Laravel.

## Estado e dados

| Camada | Uso |
|--------|-----|
| **Zustand** | UI pura: tema claro/escuro, modais, menu |
| **React Query** | Dados da API; `staleTime` alto em projetos/sistemas; `staleTime: 0` + polling em dispatches/resultados pendentes |

## Formulários e erros

- `react-hook-form` + `zodResolver` alinhados a `lib/contracts/`.
- Respostas `422` da API mapeadas de volta para campos via `error-handler` (português).

## Capas e mídia

- Seleção: arquivo novo (`cover`) ou item da biblioteca (`cover_upload_id`).
- Exibição: `NEXT_PUBLIC_MEDIA_BASE_URL` + `cover_path` retornado pela API (sem sufixo `/api`).

## Tema (design system)

- Tokens em `app/globals.css` com Tailwind v4 (`@theme inline`).
- Componentes usam utilitários derivados das variáveis — sem cores fixas no JSX.
- Alternância de tema no header via store Zustand.
- Landing pública (`components/landing/`) usa seções claras/escuras com scroll suave e navegação por âncora.

## Fluxos recentes

| Fluxo | Onde |
|-------|------|
| Landing `/` | Pública; CTA para login ou área logada conforme cookie |
| Dispatch | Checkboxes de responsabilidade/termos + `terms_version`; modal de profundidade (`quick`/`full`) e escopo DAST (`start_path` / `max_routes`) ao clicar DAST/SAST |
| Resultados | Lista com exclusão individual ou em massa (modais); badge de profundidade nos dispatches |
| Remediação | Toggle catálogo vs IA; cards com contexto de código e confiança |
| Historico do sistema | Preview na página do sistema + `/historico-remediacao` com datepicker e filtro por tipo |
| Admin / catálogo | Sidebar `/admin` (`ADMIN`): usuários em `/admin/users/permissoes`. Catálogo global fica em **Auditoria** (`/auditoria/*`) para `ADMIN` e `SPECIALIST`. |
| Guia inicial | Abre sozinho só sem projetos e se o usuário ainda não dispensou; reabre pelo botão em `/projetos`. |
| Auth Google | BFF `/api/auth/google*` + OIDC na API (ID Token + nonce anti CSRF). |
| Avatar | Upload com modal de zoom/enquadramento antes de salvar. |
| Arsenal manual | `/projetos/.../sistemas/.../arsenal` — proxy HTTP, payload catalogado, mapa de rotas; link no hero do sistema |
| Notificações | Sininho no header (`NotificationBell`); poll 20s; badge unread + pending; toasts após dispatch/import CSV |
| Sessao do alvo | Painel no sistema/arsenal; extensao Chrome (`shingeki-extension`) para SaaS; lab via popup; import manual |
