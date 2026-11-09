# Pipeline

Arquivo: `internal/orchestrator/pipeline.go` e `session.go`. `cmd/worker` monta discovery, attack, evidence e publisher e entrega cada lote a `Pipeline.Run` com timeout `WORKER_JOB_TIMEOUT`.

`Run` publica o completion no `defer`, depois executa nesta ordem:

1. Fecha o evidence no fim (`DOMXSS` e `DOMRedirect` seguram browser).
2. Aborta se o context já está cancelado.
3. `targeturl.Normalize` e `AssertHTTP`.
4. `httputil.CheckReachable`: GET de 15s, sem seguir redirect para outra origem. Qualquer resposta HTTP conta como alcançável; erro de transporte falha o lote.
5. `Auth.MaterializeBrowserState`.
6. `discovery.Discover`.
7. `publishSecretLeaks`, só se alguma categoria do lote é `SECRET_LEAK`.
8. `MapVectorsToJobs` + `ApplyAuth`. Auth de sessão vira headers do job, restritos ao host do alvo.
9. `establishControl` se `HasSession`.
10. Executa jobs em fatias. Sem sessão, uma fatia com todos. Com sessão, fatias de 20 (`sessionBatch`). Entre fatias, um GET na URL de controle: `401` ou `403` devolve `ErrSessionExpired` e para. `401` de um payload não expira a sessão.
11. Cada resposta vira probe e, se a evidência confirmar e o par ainda não foi publicado, um achado.

Publicação de probe e achado usa context novo de 10s (`publishTimeout`), para um cancelamento no meio do job ainda conseguir entregar o que já foi decidido.

## Controle de sessão

`httpSessionGuard.Establish` percorre alvo e rotas descobertas, no máximo 30 URLs same-origin. O primeiro GET `2xx` vira a URL de controle. Se só viu `401`/`403`, o lote encerra com `session_expired` antes dos ataques. Se nenhuma URL respondeu com clareza, o controle fica vazio e os jobs seguem sem rechecagem.

`Expired` repete o GET dessa URL. Erro de transporte sobe como falha do lote (`session control`), não como sessão expirada.

## Probes montados aqui

| Função | Quando |
|--------|--------|
| `skippedProbe` | `Response.Skipped` (rota pública em categoria JWT) |
| `errorProbe` | erro de job que não é cancelamento e não é só timeout com evidência |
| `publishSecretLeaks` | um achado por token distinto (`kind` + valor) e um probe resumo |
| probe normal | `vulnerable` se `Analyze` devolveu finding, senão `clean` |

`findingIdentity` deduplica achado por `attack_id` + rota canônica. O probe da segunda tentativa no mesmo sink ainda é publicado.

`secretLeakAttackID` procura categoria `SECRET_LEAK` sem diferenciar maiúsculas. Sem ela, a varredura passiva não roda. Erro do scanner vira probe `error` e o pipeline continua nos ataques.

## Contextos

O consumer cria o context do job em `CancelRegistry.Begin` e o worker ainda aplica o timeout do job. Cancelamento do processo (`SIGINT`/`SIGTERM`) cancela o pai. Cancelamento de um disparo usa `context.Cause` = `ErrDispatchCancelled`, que o `defer` distingue de timeout e de falha.

Resposta com `context.Canceled` é ignorada (não vira probe). As outras entram na classificação acima.
