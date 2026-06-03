# shingeki-client

Cliente web **Next.js** (App Router) que cobre autenticação, projetos, sistemas, assinaturas, disparo de ataques, resultados e upload de capas. Consome a API Laravel via **BFF** (`app/api/*`).

## Estrutura de pastas

```
app/
  (auth)/            # Login e registro (rotas públicas)
  (app)/             # Área autenticada (header + páginas de projetos/sistemas/resultados)
  api/               # Route handlers REST — proxy para a Laravel
proxy.ts             # Proteção de rotas privadas (redireciona não autenticados)
lib/
  api/               # Cliente HTTP (browser/servidor) + error-handler (mensagens em PT)
  contracts/         # Schemas Zod (formulários) + tipos de resposta da API
  hooks/             # React Query por recurso (auth, projects, systems, cover-uploads, attack, results, signature)
  stores/            # Zustand — tema e estado de UI
components/
  ui/                # Primitivos (Button, Input, Modal, CoverUpload, CoverLibraryPicker, …)
  forms/             # Project, System, CoverFields, login/register
  projects/ systems/ signature/ attack/ results/
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

## Paridade com o mobile

Mesmos contratos Zod e fluxos de negócio; diferença principal: web usa BFF + cookie http-only; mobile chama a API diretamente com token em `expo-secure-store` ([shingeki-mobile](shingeki-mobile.md)).
