# API — Notificações in-app

Inbox persistida para jobs assíncronos: o usuário pode navegar enquanto scans e importações processam em fila. Voltar ao [índice da API](../API.md).

## Modelo

Uma linha em `user_notifications` por job, com ciclo:

```
pending → completed | failed
```

| Tipo (`type`) | Quando é criada | Quando finaliza |
|---------------|-----------------|-----------------|
| `attack_dispatch` | `POST .../attacks/dispatch` (202) | Consumer `attacks:consume-results` (`attack.dispatch.completed`) |
| `catalog_import` | Import CSV enfileirado | Último chunk em `catalog:consume-imports` (ou falha na validação) |

Cadastro **unitário** de ataque/medicação no catálogo é síncrono e **não** gera notificação.

## Rotas

Base: `/api/notifications` — exige `auth:sanctum` (qualquer papel autenticado).

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/notifications` | Lista paginada + contagens |
| GET | `/api/notifications/unread-count` | Badge (unread + pending) |
| PATCH | `/api/notifications/{id}/read` | Marca uma como lida |
| POST | `/api/notifications/read-all` | Marca todas como lidas |
| DELETE | `/api/notifications/{id}` | Remove uma notificacao |
| DELETE | `/api/notifications` | Remove todas do usuario |

### Query params (GET lista)

| Param | Default | Descrição |
|-------|---------|-----------|
| `page` | `1` | Página |
| `per_page` | `25` | Itens por página (máx. 100) |

### Resposta GET `/api/notifications`

```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "attack_dispatch",
      "status": "completed",
      "title": "Scan DAST finalizado",
      "body": "Vulnerable PHP Target — 2 finding(s) em 1.5 s",
      "action_url": "/projetos/{projectId}/sistemas/{systemId}/resultados/{dispatchId}",
      "payload": {},
      "read_at": null,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "pagination": { "current_page": 1, "last_page": 1, "per_page": 25, "total": 1 },
  "unread_count": 1,
  "pending_count": 0
}
```

- **unread_count:** notificações `completed` ou `failed` ainda não lidas (`read_at` null).
- **pending_count:** notificações `pending` (job em andamento).

Notificações `pending` não entram em `unread_count`; aparecem no sininho com badge de jobs ativos.

## action_url

URLs relativas ao client Next.js:

| Tipo | Destino típico |
|------|----------------|
| `attack_dispatch` | Página de resultados do dispatch |
| `catalog_import` | `/auditoria/ataques` ou `/auditoria/medicacoes` |

## Client web

- Sininho no header (`NotificationBell`) com poll a cada 20s
- Ao disparar scan ou enviar CSV, toast orienta acompanhar pelo sininho
- BFF: `shingeki-client/app/api/notifications/*`

## Migration

```bash
php artisan migrate
```

Tabela: `user_notifications` (`2026_06_21_100000_create_user_notifications_table.php`).
