# API — Admin: observabilidade

`GET /api/admin/ops/status` (`role:ADMIN`) agrega saúde da captura remota, profundidade das filas RabbitMQ e uso recente.

## Captura

Chama `GET {CAPTURE_SERVICE_URL}/health`. Resposta inclui `status` (`ok` | `down`), `busy` e `active_capture_id`.

## Filas

Usa a Management API do RabbitMQ (`RABBITMQ_MGMT_URL`, padrão `http://127.0.0.1:15672`) com `RABBITMQ_USER` / `RABBITMQ_PASSWORD`. Para cada fila em `config/ops.php`: `messages`, `consumers` e `status` (`ok` se há consumer, `degraded` sem consumer, `down` se a API falhar). Filas em `polled_queues` (resultados e importação de catálogo) usam `basic.get` em loop, então `consumers` fica 0 mesmo com o processo no ar. Elas ficam `ok` enquanto `messages` é 0 e `degraded` quando há mensagens paradas.

## Uso

Contadores em janelas de 24h e 7d: disparos por tipo/status, capturas criadas/importadas, contas distintas que abriram o navegador. `in_flight` lista até 10 disparos ainda em andamento.
