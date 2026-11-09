# Ataque

O pipeline chama dois métodos de `attack.Engine`: `MapVectorsToJobs` e `ExecutePool`. A implementação é `RestyEngine`.

## Do vetor ao job

`MapVectorsToJobs` (função, também método do engine) cruza cada vetor com cada item do catálogo.

- Categoria `SECRET_LEAK` é ignorada aqui. Ela já rodou no scanner passivo.
- `locationCompatible`: locais iguais casam. `API_ENDPOINT` casa com `JSON_BODY` e `FORM`, e o inverso de `JSON_BODY` com `API_ENDPOINT`. `HEADER` casa com **qualquer** local do vetor.
- Payload sem `value` e sem `values` é pulado.
- `payloadVariants` gera um job por valor. `value` entra na lista se ainda não estava em `values`.
- Se o payload traz `field` (ou `parameter`), um job só, nesse parâmetro. Senão, um job por chave de `vector.Params`. Sem parâmetros, um job com `ParamKey` vazio.
- `injectableParam` recusa viewstate ASP.NET e nomes de token CSRF. Esses campos não recebem payload.

`RestyEngine.MapVectorsToJobs` aplica `CapJobs` quando `ATTACK_MAX_JOBS` está definido e a lista passa desse número. Sem a variável, não há teto. O `.env.example` usa `5000`. O corte é round-robin por vetor (`rota + método + local`).

`ApplyAuth` copia headers da sessão para cada job, via `HeadersForURL`. `ApplyGlobalHeaders` existe e não é usado pelo pipeline.

## Montagem da requisição (`attack/injectors`)

`build` olha `Attack.TargetLocation` e, se vazio, o local do vetor.

| Local | Função | Onde o payload entra |
|-------|--------|----------------------|
| `QUERY_PARAMETER` | `buildQuery` | query HTTP ou, se a URL tem query no fragmento (`/#/search?q=`), nesse fragmento |
| `URL_PATH` | `buildPath` | último segmento; `..` é reescrito para o segmento continuar sendo um path |
| `HEADER` | `buildHeader` | header nomeado por `ParamKey`. Categoria JWT troca o Bearer por um token `alg=none` derivado do token da sessão; o baseline usa um token quebrado |
| `COOKIE` | `buildCookie` | um par no header `Cookie`, sem apagar os outros |
| `FORM` | `buildForm` | campo do form urlencoded |
| `JSON_BODY`, `API_ENDPOINT` | `buildJSON` | campo no objeto JSON |
| `XML_BODY` | `buildXML` | elemento no documento; raiz vem de `XMLRoot` ou de um nome derivado |
| `FILE_UPLOAD` | `buildMultipart` | parte de arquivo |
| qualquer outro | `buildQuery` | cai em query |

`BuildBaseline` chama `build` com injeção desligada (valor original do parâmetro). `BuildAttack` injeta. `BuildUnauthenticated` é o baseline sem `Authorization` e sem `Cookie`. `BuildXMLProbe` existe para o validador de XXE pedir uma segunda requisição com entidade interna.

## Execução

`ExecutePool` limita concorrência com um semáforo (`WORKER_ATTACK_CONCURRENCY`, mínimo 1) e devolve as respostas na mesma ordem dos jobs. Job que não chega a sair porque o context já fechou volta com `Error = ctx.Err()`.

`executeJob`:

1. Categoria cujo nome contém `JWT`: `routeIsPublic` manda o baseline sem credencial. Status `2xx` marca `Skipped` e não envia o ataque. O resultado fica em cache por método+URL.
2. Monta baseline e ataque. O dump gravado em `RawRequest` é o do ataque, já com redação de header sensível (`DumpRequest`).
3. Baseline entra em cache pela chave método + URL + headers + corpo. O primeiro erro de baseline não é cacheado.
4. Envia o ataque.

`send` espera o rate limit (`ATTACK_RATE_LIMIT_RPS`; `0` desliga o limite), executa com Resty, não segue redirect cross-origin (`CheckSameOriginRedirect`) e corta o corpo em `ATTACK_MAX_BODY_BYTES` (default de código 1 MiB). Guarda status, corpo, `Location` e duração. User-Agent default: `Shingeki-DAST-Worker/1.0`.

Timeout e cancelamento de context marcam `TimedOut`. O pipeline só descarta de verdade o `context.Canceled`. Timeout ainda passa pela evidência; se nenhum validador confirma, vira probe `error`.
