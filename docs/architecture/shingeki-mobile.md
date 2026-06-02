# shingeki-mobile

App **Expo** (React Native) com a mesma divisão de `lib/` e contratos do [shingeki-client](shingeki-client.md), adaptado para Android/iOS com **NativeWind**.

## Estrutura de pastas

```
app/
  (auth)/            # Login e registro
  (app)/projetos/    # Listagem, projeto, sistema, resultados por dispatch
lib/
  api/               # client.ts (axios), auth-storage, multipart-request, error-handler
  contracts/         # Zod — espelho do web (auth, project, system, cover-*, attack, signature, result)
  hooks/             # React Query — use-auth, use-projects, use-systems, use-cover-uploads, use-attack, use-signature, use-results
  stores/            # theme-store, ui-store
  cover-*.ts         # URLs de mídia, biblioteca, image-picker
components/
  ui/                # CoverUpload, CoverLibraryPicker, CoverHero, …
  forms/ projects/ systems/ signature/ attack/ results/
```

## Comunicação com a API

- Chamadas **diretas** ao Laravel (`EXPO_PUBLIC_API_BASE_URL` termina em `/api`).
- **Sem BFF**: o app não passa pelo Next.js.
- Token Sanctum em **`expo-secure-store`** após login; interceptor axios anexa `Authorization: Bearer`.

## Rede e ambiente

- Emulador Android: host `10.0.2.2` (mapeia para a máquina do desenvolvedor).
- Dispositivo físico: IP da LAN; API com `php artisan serve --host=0.0.0.0`.
- `EXPO_PUBLIC_MEDIA_BASE_URL` **sem** `/api` — montagem de URLs de capa em `lib/cover-image.ts`.

## Upload multipart

- `lib/multipart.ts` monta `FormData` com `cover` ou `cover_upload_id`.
- `lib/api/multipart-request.ts` usa **fetch** para envio (axios quebra boundary em alguns ambientes RN).
- Biblioteca de capas: `use-cover-uploads` + UI `CoverLibraryPicker` / `CoverUpload`.

## UI e navegação

- **Expo Router** — grupos `(auth)` e `(app)`; rotas dinâmicas `[projectId]`, `[systemId]`, `[dispatchId]`.
- **CoverHero**: `expo-linear-gradient` + imagem de capa em telas de projeto/sistema.
- Cards e listas com `Pressable` (evita conflito de gestos com `Link`).

## Estado e dados

- Mesmo padrão React Query + Zustand do web.
- Polling em `use-results` para `dispatch.status` até conclusão (`?.dispatch?.status` defensivo).

## Paridade com o web

Fluxos de negócio alinhados (projetos, sistemas, capas, assinatura, ataque, resultados). Diferenças: armazenamento de token, rede do emulador, picker de galeria (`expo-image-picker`) e ausência de cookie http-only.
