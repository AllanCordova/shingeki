# Filas e eventos

Três nomes, todos configuráveis. Defaults de `config.Load`:

| Env | Default | Papel |
|-----|---------|--------|
| `RABBITMQ_ATTACKS_DISPATCH_QUEUE` | `attacks.dispatch` | entrada, fila durável, um consumer `dast-worker`, ack manual |
| `RABBITMQ_ATTACKS_CANCEL_QUEUE` | `attacks.dispatch.cancel` | nome do **exchange fanout** de cancelamento |
| `RABBITMQ_ATTACKS_RESULTS_QUEUE` | `attacks.results` | saída única de probe, achado e completion |

`DeclareAttackQueues` declara dispatch e results como filas duráveis, não exclusivas, sem auto-delete. O cancelamento não é essa fila: `declareCancelFanout` declara o exchange fanout e uma fila durável `{exchange}.{hostname}` ligada a ele, para cada processo receber o cancelamento.

Publicação: exchange vazio, routing key = nome da fila de resultados, `content-type: application/json`, entrega persistente. Se o publish falha, o publisher reconecta uma vez e tenta de novo.

## Entrada: `attack.dispatch.batch`

Tipo: `contracts.DispatchBatch`. `ParseDispatchBatch` recusa o lote inteiro se a validação falhar.

Obrigatórios: `event` exatamente `attack.dispatch.batch`, `dispatch_id`, `system_id`, `user_id`, `target_url` http(s) sem userinfo e sem host proibido, `attacks` não vazio. `scan_type` vazio vira `DAST`. Qualquer outro tipo, inclusive `SAST`, é rejeitado.

Cada item de `attacks` precisa de `attack_id`, `category`, `target_location` e `payload` não vazio. O worker não escolhe payload: usa `value`, `field` ou `parameter`, e a lista `values`.

Campos que mudam o discovery:

| Campo | Efeito |
|-------|--------|
| `depth` | `quick` ou, no resto, `full` |
| `start_path` | semente do crawl, mesma origem do alvo |
| `max_routes` | substitui `MaxPages` e limita a quantidade de vetores |
| `route_map` | até 400 rotas; se não vazio, **só** essas rotas são atacadas |
| `auth` | sessão capturada, ver abaixo |

`route_map[]`: `method` (`GET` `POST` `PUT` `PATCH` `DELETE` `HEAD` `OPTIONS` ou vazio), `path` relativo à origem, `query` opcional, `body` JSON opcional. Path absoluto ou com scheme é recusado. `{placeholder}` no path é substituído; valor vazio, `..` ou separador é inválido. Query vira vetor `QUERY_PARAMETER`. Body, ou método de escrita, vira vetor `JSON_BODY`. Todo item também gera um vetor `URL_PATH`.

## Auth no lote

`contracts.TargetAuth`. Tipos de material que o pipeline usa de fato:

- `state`: envelope AES-256-GCM (`v`, `alg`, `nonce`, `ct`). `MaterializeBrowserState` lê `BROWSER_STATE_KEY` (32 bytes em base64), decifra e preenche cookies e storage. Sem a chave, o lote falha antes do discovery.
- `cookies`, `headers`, `storage` (`local`, `session`, `origins`): sessão já pronta. `HeadersForURL` só anexa `Cookie` e `Authorization` se o host do vetor está no escopo do alvo (`HostInScope`: mesmo host ou subdomínio, e não é host proibido).
- `routes`: URLs gravadas no navegador. Entram na fila do Rod e, depois, em `AppendRecordedRoutes`. Não entram quando há `route_map`.

`HasSession` é verdadeiro com cookies, header `Authorization` ou `Cookie`, ou storage não vazio. É essa condição que arma o controle de sessão no orchestrator.

Hosts recusados por `AssertHTTP` / `IsDisallowedHost`: `metadata.google.internal` e IPs link-local. `TARGET_LOCALHOST_REWRITE` troca `localhost`, `127.0.0.1` e `::1` por outro host antes do ping. Vazio no `.env.example` de propósito: no container, loopback é o do próprio container.

## Cancelamento: `attack.dispatch.cancel`

```json
{ "event": "attack.dispatch.cancel", "dispatch_id": "uuid" }
```

`CancelRegistry.Cancel` cancela o context daquele `dispatch_id` com `ErrDispatchCancelled`. Se o lote ainda não começou, o id fica em `early` por 6 horas e o `Begin` seguinte já nasce cancelado. O pipeline trata essa causa como `status: cancelled` e não como erro.

## Saída: três formatos na mesma fila

### `attack.probe`

`contracts.ProbeMessage`. Toda tentativa relevante publica um. `outcome`: `vulnerable`, `clean` ou `error`. `error` exige `error_message`.

Casos especiais:

| Situação | outcome | evidence |
|----------|---------|----------|
| JWT em rota que responde 2xx sem credencial | `clean` | rota pública; JWT não testado |
| erro de rede ou montagem, sem timeout | `error` | falha ao executar teste |
| timeout | segue para evidência; se nada confirmar, `error` | |
| `SECRET_LEAK` sem token | `clean` em `…/api/config` | nenhum token comum |
| `SECRET_LEAK` com token | `vulnerable` | contagem de tokens |
| falha da varredura de segredos | `error` | a varredura não derruba o lote |

### Achado

`contracts.ResultMessage`, sem campo `event`. Um por par `(attack_id, rota canônica)`. Repetição no mesmo sink não gera outro achado; o probe da tentativa ainda sai. Campos obrigatórios: `dispatch_id`, `attack_id`, `system_id`, `vulnerable_route`, `payload_used`, `evidence`, `http_request`.

`CanonicalSinkRoute` zera os valores de query (e da query do fragmento `#/rota?q=`) para o mesmo parâmetro não virar achados duplicados.

### `attack.dispatch.completed`

Sempre publicado no `defer` de `Pipeline.Run`, com context novo de 10s, mesmo se o job foi cancelado. Status:

| Status | Quando |
|--------|--------|
| `completed` | `Run` retornou nil |
| `cancelled` | causa do context é `ErrDispatchCancelled` (`err` do `Run` vira nil) |
| `session_expired` | `ErrSessionExpired` |
| `failed` | qualquer outro erro; `error` é obrigatório |

Contadores: `duration_ms`, `findings_count`, `probes_count`, `vectors_discovered`, `jobs_planned`.
