# shingeki-mobile

App **Expo** (React Native) com a mesma divisão de `lib/` e contratos do [shingeki-client](shingeki-client.md), adaptado para Android/iOS com **NativeWind**.

## Estrutura de pastas

```
app/
  (auth)/            # Login e registro
  (app)/perfil/      # Perfil do usuario (alterar nome)
  (app)/projetos/    # Listagem, projeto, sistema, resultados por dispatch
lib/
  api/               # client.ts (axios), auth-storage, error-handler
  contracts/         # Zod — auth, project, system, attack, signature, result
  hooks/             # React Query — use-auth, use-projects, use-systems, use-attack, use-signature, use-results
  stores/            # ui-store
  cover-image.ts     # URLs de capa (somente leitura, se existir no registro)
components/
  ui/                # CoverHero, CoverImage (exibição), …
  forms/ projects/ systems/ signature/ attack/ results/
```

## Comunicação com a API

- Chamadas **diretas** ao Laravel (`EXPO_PUBLIC_API_BASE_URL` termina em `/api`).
- **Sem BFF**: o app não passa pelo Next.js.
- Token Sanctum em **`expo-secure-store`** após login; interceptor axios anexa `Authorization: Bearer`.
- Create/update de projeto e sistema em **`application/json`** (sem upload de capa no mobile).

## Rede e ambiente

- Emulador Android: host `10.0.2.2` (mapeia para a máquina do desenvolvedor).
- Dispositivo físico: IP da LAN; API com `php artisan serve --host=0.0.0.0`.
- `EXPO_PUBLIC_MEDIA_BASE_URL` **sem** `/api` — exibe capas já definidas pelo client web em `lib/cover-image.ts`.

## UI e navegação

- Tema **escuro fixo** (`global.css` + `lib/css-vars.ts` com `vars()` no layout raiz). Telas usam `Screen` / `AppScrollView` e `stackContentStyle` com `backgroundColor` nativo em todos os Stacks (variáveis CSS não propagam para rotas filhas no RN).
- **Expo Router** — grupos `(auth)` e `(app)`; rotas dinâmicas `[projectId]`, `[systemId]`, `[dispatchId]`.
- **CoverHero**: `expo-linear-gradient` + imagem quando `cover_path` existe; fallback sem imagem caso contrário.
- Cards e listas com `Pressable` (evita conflito de gestos com `Link`).

## Estado e dados

- Mesmo padrão React Query + Zustand do web.
- Polling em `use-results` para `dispatch.status` até conclusão (`?.dispatch?.status` defensivo).

## Paridade com o web

Fluxos de negócio alinhados (projetos, sistemas, assinatura, ataque, resultados). **Upload de capa apenas no client web.** O mobile cria/edita entidades sem capa e pode exibir capas criadas pelo web quando `cover_path` está preenchido.
