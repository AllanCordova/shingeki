# Clientes

Índice dos clients do Shingeki. Setup: [RUN-PROJECT.md](RUN-PROJECT.md). Contratos HTTP: [API.md](API.md). Voltar ao [início](index.md).

| Client | Documento |
|--------|-----------|
| Web (Next.js + BFF) | Arquitetura: [shingeki-client.md](architecture/shingeki-client.md). Desenvolvimento: [WEB-DEVELOPMENT.md](WEB-DEVELOPMENT.md). |
| Extensão Chrome/Edge | Contrato: [TARGET-SESSION.md](api/TARGET-SESSION.md). Empacotamento: [apps/extension/README.md](https://github.com/AllanCordova/shingeki/blob/main/apps/extension/README.md). |

O browser nunca vê o token Sanctum: cookie http-only no BFF.

## Recursos no client web

| Recurso | Onde |
|---------|------|
| Auth (e-mail + Google) | Login/registro; perfil com avatar |
| Projetos, dashboard e sistemas | `/projetos`, settings DAST em `/configuracoes/sistemas` |
| Aceite + dispatch DAST/SAST | Página do sistema (não há mais assinatura digital no alvo) |
| Resultados, probes, gráfico, comparar, PDF | Página do dispatch e `/comparar` |
| Remediação, IA, PR GitHub, histórico | Página do sistema / dispatch |
| Auditoria (catálogo) | `/auditoria/*` (`ADMIN`, `SPECIALIST`) |
| Admin de papéis | `/admin/users/permissoes` (`ADMIN`) |
| Sidebar | GraphQL — `/configuracoes/navegacao` |
| Notificações | Sininho + `/notificacoes` |
| Arsenal manual | `/projetos/.../arsenal` |
| Sessão do alvo | Painel no sistema; extensão ou popup/lab |
