# Clientes (web e mobile)

Guia de desenvolvimento dos frontends do Shingeki. Voltar ao [início](index.md).

Ambos consomem a mesma [API REST](API.md) (Sanctum). Contratos Zod e fluxos de negócio são alinhados entre web e mobile.

## Escolha o client

| Client | Stack | Guia |
|--------|-------|------|
| **Web** | Next.js (App Router), BFF com cookie http-only | [WEB-DEVELOPMENT.md](WEB-DEVELOPMENT.md) |
| **Mobile** | Expo / React Native, token em secure store | [MOBILE-DEVELOPMENT.md](MOBILE-DEVELOPMENT.md) |

## Antes de começar

1. API rodando — [Como rodar o projeto](RUN-PROJECT.md)
2. Credenciais do seed — `test@example.com` / `password` ([detalhes](RUN-PROJECT.md#credenciais-do-seed))
3. Arquitetura do client escolhido — [shingeki-client](architecture/shingeki-client.md) ou [shingeki-mobile](architecture/shingeki-mobile.md)

## Paridade

| Recurso | Web | Mobile |
|---------|-----|--------|
| Auth (login/registro) | Sim | Sim |
| Projetos e sistemas | Sim | Sim |
| Assinaturas e dispatch | Sim | Sim |
| Resultados e remediação | Sim | Sim |
| Admin / catálogo (`ADMIN`, `SPECIALIST`) | Sim (sidebar `/admin`) | Parcial (roles no contrato) |
| BFF / cookie http-only | Sim | Não (API direta) |
