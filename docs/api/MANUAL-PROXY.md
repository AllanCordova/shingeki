# API — Arsenal manual (proxy)

Envio de requests HTTP customizados ao `target_url` do sistema, com injeção opcional de payload e mapa de rotas reutilizáveis. Voltar ao [índice da API](../API.md).

## Papéis

Rotas exigem `auth:sanctum` e middleware `role:ADMIN,SPECIALIST`.

| Papel | Acesso |
|-------|--------|
| `USER` | Sem acesso |
| `SPECIALIST` | Enviar requests e gerenciar rotas próprias |
| `ADMIN` | Mesmo que `SPECIALIST` |

Policy: `SystemPolicy::useManualProxy`.

## Resolução de URL

O proxy roda **no host da API** (não no worker Docker):

| `target_url` cadastrado | URL usada pelo proxy |
|-------------------------|----------------------|
| `http://127.0.0.1:8090` | Igual |
| `http://localhost:8090` | Igual |
| `http://vulnerable-target` (legado) | Reescrito para `VULNERABLE_TARGET_URL` (`http://127.0.0.1:8090` por padrão) |

Workers DAST continuam usando `WorkerTargetUrlResolver::forWorker()` (rede Docker). O manual proxy usa `forManualProxy()`.

## Rotas

Base: `/api/projects/{project}/systems/{system}/manual-proxy`

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/send` | Envia request ao alvo (throttle 30/min) |
| GET | `/routes` | Lista rotas salvas do usuário |
| POST | `/routes` | Salva rota no mapa |
| PUT | `/routes/{manualRouteMap}` | Atualiza rota |
| DELETE | `/routes/{manualRouteMap}` | Remove rota |

## POST .../manual-proxy/send

**Body (JSON):**

| Campo | Regras |
|-------|--------|
| `method` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS` |
| `path` | Relativo, deve começar com `/` (ex.: `/login.php`) |
| `query` | Opcional; objeto string→string |
| `headers` | Opcional; objeto string→string |
| `body` | Opcional; string bruta |
| `content_type` | Opcional |
| `use_target_session` | Boolean; envia Cookie/Bearer da [sessão do alvo](TARGET-SESSION.md) |
| `payload` | Opcional; `{ target_location, field, value }` para injeção catalogada |

**Resposta `200`:**

```json
{
  "message": "Manual proxy request completed.",
  "url": "http://127.0.0.1:8090/login.php?q=...",
  "method": "GET",
  "request_dump": "GET http://... HTTP/1.1\r\n...",
  "status_code": 200,
  "response_headers": {},
  "response_body": "...",
  "response_body_truncated": false,
  "duration_ms": 42
}
```

Erros de conexão retornam `422` com mensagem indicando a URL resolvida.

## Mapa de rotas

Cada rota salva pertence ao **usuário autenticado** e ao **sistema** (`manual_route_maps`). Campos: `name`, `method`, `path`, `query`, `headers`, `body`, `content_type`, `notes`.

Query e headers vazios são persistidos como `null` e serializados como `{}` na resposta.

## Client web

- Página dedicada: `/projetos/{projectId}/sistemas/{systemId}/arsenal`
- Botão **Arsenal manual** no hero da página do sistema (ADMIN/SPECIALIST)
- Painel inclui sessão do alvo + formulário de proxy + mapa de rotas

BFF: `shingeki-client/app/api/projects/.../manual-proxy/*`.
