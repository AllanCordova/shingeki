# API — Admin: capturas de navegador

Endpoints `role:ADMIN` para auditar qual conta usou o navegador de sessão (e quais URLs foram visitadas). Voltar ao [índice da API](../API.md).

## Listagem

`GET /api/admin/browser-captures`

Query: `page`, `per_page`, `user_id`, `system_id`, `source` (`remote_browser` | `manual_import`), `status` (`pending` | `completed` | `expired`), `from`, `to`.

Resposta: `{ captures: [...], pagination }`. Cada item inclui e-mail da conta, sistema/projeto, `browser_opened_at`, `navigated_count` e `dispatch_id`. Não devolve tokens nem `browser_state`.

## Detalhe

`GET /api/admin/browser-captures/{id}`

Devolve a sessão e a timeline em `events` (`created`, `browser_opened`, `navigated`, `completed`, `imported`, `expired`), com `url` quando aplicável.

## Exportação

`GET /api/admin/browser-captures/export`

Mesmos filtros da listagem. CSV (UTF-8 com BOM, separador `;`) com sessões e, em seguida, os eventos. Sem cookies, tokens ou ciphertext.
