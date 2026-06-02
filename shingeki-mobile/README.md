# shingeki-mobile

App mobile Expo (React Native) espelhando o [shingeki-client](../shingeki-client): mesma estrutura de `lib/`, contratos Zod, React Query, Zustand e design system (NativeWind).

Instruções completas para rodar no Android: **[docs/DESENVOLVIMENTO-ANDROID.md](../docs/DESENVOLVIMENTO-ANDROID.md)**.

Capas: galeria (`expo-image-picker`), biblioteca do usuário (`GET /cover-uploads`) e envio multipart (`cover` / `cover_upload_id`), alinhado ao web client.

## Arquitetura

- Chamadas **diretas** ao Laravel (sem BFF); token Sanctum em `expo-secure-store`
- `lib/api/error-handler.ts` — erros 422 e mensagens traduzidas
- Rotas em `app/(auth)` e `app/(app)/projetos/...`
