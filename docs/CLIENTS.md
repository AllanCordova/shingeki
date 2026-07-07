# Clientes

Guia de desenvolvimento do frontend web do Shingeki. Voltar ao [início](index.md).

O [client web](architecture/shingeki-client.md) consome a [API REST](API.md) via BFF Next.js com cookie http-only (Sanctum).

## Antes de começar

1. API rodando — [Como rodar o projeto](RUN-PROJECT.md)
2. Credenciais do seed — `test@example.com` / `password` ([detalhes](RUN-PROJECT.md#credenciais-do-seed))
3. Arquitetura do client — [shingeki-client](architecture/shingeki-client.md)

## Recursos no client web

| Recurso | Disponível |
|---------|------------|
| Auth (login/registro) | Sim |
| Projetos e sistemas | Sim |
| Assinaturas e dispatch DAST/SAST | Sim |
| Resultados e remediação | Sim |
| Preview e abertura de PR no GitHub (SAST) | Sim |
| Admin / catálogo (`ADMIN`, `SPECIALIST`) | Sim (sidebar `/admin`) |
| Notificações | Sim |
| Arsenal manual | Sim |

Guia de desenvolvimento: [WEB-DEVELOPMENT.md](WEB-DEVELOPMENT.md).
