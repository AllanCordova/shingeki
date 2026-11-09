# Catálogo de funções

Funções de produção, arquivo por arquivo. Testes (`*_test.go`) ficam de fora. O fluxo está em [pipeline.md](pipeline.md), [discovery.md](discovery.md), [ataque.md](ataque.md) e [evidencia.md](evidencia.md). Aqui é o mapa para achar o símbolo.

## `cmd/worker/main.go`

| Função | Faz |
|--------|-----|
| `main` | Carrega config, conecta o publisher, sobe o consumer de cancelamento e o de dispatch. Cada lote roda `Pipeline.Run` com o timeout do job |
| `connectPublisherWithRetry` | Até 15 tentativas, espera cresce com o número da tentativa. Respeita o sinal de parada |

## `cmd/harness/main.go`

| Função | Faz |
|--------|-----|
| `main` | Flag `-fixture` `secrets`, `access` ou `inject`. Sobe `httptest`, avalia e imprime HIT, EXTRA e MISS. Exit 1 se faltar desafio |
| `printReport` | Formato texto do `goldset.Report` |

## `internal/config/config.go`

| Função | Faz |
|--------|-----|
| `Load` | Lê env, aplica default e valida faixa. Ver a tabela de divergência em [README.md](README.md) |
| `Config.RabbitMQURL` | Monta `amqp://user:pass@host:port/vhost` |
| `getEnv` | Valor do ambiente ou o fallback. String vazia conta como ausente |

## `internal/queue`

| Função | Faz |
|--------|-----|
| `dialRabbitMQ` | Até 15 tentativas de conexão, espera 1s, 2s, … |
| `DeclareAttackQueues` | Declara cada nome como fila durável |
| `NewConsumer` / `Run` | QoS = prefetch, consume manual, loop até o context ou o canal fechar |
| `handleDelivery` | Parseia o lote. JSON inválido: `Nack` sem requeue. Lote válido: `Begin` no registry, chama o handler e dá `Ack` mesmo se o pipeline falhou |
| `NewCancelRegistry` | Mapas de cancelamento ativo e antecipado |
| `Cancel` | Cancela o context do disparo, ou guarda o id por 6h se ele ainda não começou |
| `Begin` | Context com causa. Se o id já foi cancelado, nasce cancelado |
| `pruneLocked` | Apaga cancelamentos antecipados com mais de 6h |
| `RunCancelConsumer` | Reconecta 2s depois de queda que não seja cancelamento do processo |
| `consumeCancelsOnce` | Uma conexão: declara o fanout, consome, despacha |
| `declareCancelFanout` | Exchange durável + fila `{exchange}.{hostname}` ligada nele |
| `handleCancelDelivery` | Exige `event=attack.dispatch.cancel` e `dispatch_id`. Senão `Nack` sem requeue |
| `NewPublisher` / `Connect` / `Close` | Uma conexão e um canal protegidos por mutex |
| `PublishProbe` / `PublishResult` / `PublishCompletion` | Validam, serializam e publicam na fila de resultados |
| `publishJSON` | Se o publish falha, reconecta uma vez e tenta de novo |
| `ensureChannelLocked` | Reabre o canal se a conexão caiu |

## `internal/contracts`

| Função | Faz |
|--------|-----|
| `EffectiveScanType` / `EffectiveDepth` / `EffectiveStartPath` / `EffectiveMaxRoutes` / `EffectiveRouteMap` | Normalizam o lote: scan vazio vira DAST, depth desconhecido vira full, max negativo vira 0 |
| `ParseDispatchBatch` / `Validate` | Única porta de entrada do JSON. Regras em [filas.md](filas.md) |
| `allowedRouteMethod` | GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS |
| `AttackItem.Validate` | id, categoria, local e payload obrigatórios |
| `ParsedDispatchedAt` | RFC3339 ou tempo zero |
| `ProbeMessage.Validate` / `MarshalJSONBytes` | outcome `clean`, `error` ou `vulnerable`; `error` exige `error_message` |
| `ResultMessage.Validate` / `MarshalJSONBytes` | Seis campos de achado obrigatórios |
| `DispatchCompletionMessage.Validate` / `MarshalJSONBytes` | Quatro status; `failed` exige `error`; contadores não negativos |
| `NewAttackVector` | Rota, método, local e mapas vazios |
| `MergeVector` | Preenche campo vazio; não sobrescreve valor já visto |
| `FormTargetLocation` | GET de form vira `QUERY_PARAMETER`; o resto fica `FORM` |
| `WithQueryParams` | Acrescenta pares na query da rota |
| `StringMap.UnmarshalJSON` | Aceita objeto ou, no caso do PHP, array vazio |
| `HasSession` | Cookie estruturado, header de cookie ou bearer, ou storage |
| `AuthHeaders` | Atalho para `EffectiveAuthHeaders` |
| `LocalMap` / `SessionMap` | Cópia do storage |
| `EffectiveAuthHeaders` | Headers do lote mais cookie sintetizado e bearer tirado do storage, se ainda não existiam |
| `CookieHeaderFromCookies` / `CookieHeaderForURL` | Junta `nome=valor`. Com URL, respeita path e host do cookie |
| `CookieAppliesToURL` | Domínio, host-only e path |
| `MergeHeaders` | O mapa local ganha do global na mesma chave |
| `storageBearerToken` / `tokenFromStorageMap` / `normalizeStoredToken` / `looksLikeOpaqueToken` | Procuram um token no storage e prefixam `Bearer` quando falta |
| `HostInScope` | Mesmo host ou subdomínio, e não é host proibido |
| `HeadersForURL` | Só devolve cookie e authorization se a URL está no escopo. Outros headers do lote passam junto |
| `CookiesForTarget` / `CookiesForBrowser` | Filtram cookies do alvo. A variante de browser força host-only no host do alvo |
| `MaterializeBrowserState` | Se `type=browser_state`, decifra o envelope e substitui cookies e storage. Envelope vazio ou sessão vazia falha |
| `browserStateKey` | `BROWSER_STATE_KEY` em base64, 32 bytes |
| `decryptBrowserState` | AES-256-GCM |
| `cookiesFromPlaywright` / `storageFromPlaywright` / `itemsToMap` | Estado Playwright para os tipos do worker |

## `internal/orchestrator`

| Função | Faz |
|--------|-----|
| `NewPipeline` | Liga os quatro motores, o ping de alcance e o guard de sessão |
| `Run` | Sequência descrita em [pipeline.md](pipeline.md). O `defer` sempre publica o completion |
| `establishControl` | Sem sessão, não há URL de controle |
| `publishProbe` / `publishResult` | Context de 10s, independente do cancelamento do job |
| `publishSecretLeaks` | Scanner passivo, um achado por token e um probe resumo |
| `secretLeakAttackID` | Primeiro item cuja categoria é `SECRET_LEAK` |
| `findingIdentity` | Chave de deduplicação do achado |
| `skippedProbe` / `errorProbe` | Probes que não passaram pela evidência |
| `newHTTPSessionGuard` | Cliente de 15s, redirect só na mesma origem |
| `Establish` | Até 30 GETs. Primeiro `2xx` vira o controle. Só `401`/`403` expira a sessão agora |
| `Expired` | Repete o GET de controle |
| `get` | GET com os headers da sessão, lê no máximo 4 KiB e devolve o status |

## `internal/discovery`

| Função | Faz |
|--------|-----|
| `NewCompositeEngine` / `Discover` | Ordem do crawl em [discovery.md](discovery.md) |
| `discoverRouteMap` | Atalho exclusivo do `route_map` |
| `mergeAttackVectors` | Une Rod e Colly pela chave método + rota + local |
| `OptionsFromBatch` e os `Has*` | Leem depth, start path, max routes e o mapa |
| `ApplyDepthAndScope` | `quick` reduz limites e desliga o Rod; `max_routes` substitui `MaxPages` |
| `ResolveSeedURL` | Junta o start path à origem. Recusa outra origem |
| `ApplyDepth` | Números do modo quick |
| `CapVectors` | Corta por `max_routes` ou, no quick sem teto, em 20 |
| `CanonicalizeQueryVectors` | Normaliza query e funde parâmetros do mesmo sink |
| `FilterAttackable` | Tira o que a blocklist ou a origem recusam |
| `fallbackVectors` | Um GET na semente quando o crawl não achou nada |
| `VectorsFromRouteMap` e auxiliares de placeholder, método e body | Traduzem o mapa em vetores `URL_PATH`, `QUERY_PARAMETER` e `JSON_BODY` |
| `AppendRecordedRoutes` | Soma `auth.routes` que ainda não estão na lista |
| `recordedLocation` | Escolhe o local do vetor pelo método, pela URL e pelo tipo gravado |
| `seedLoginJSONParams` | Preenche email e senha num vetor de login JSON que a sessão já gravou |

Crawlers e BFS:

| Função | Faz |
|--------|-----|
| `NewCollyCrawler` / `Discover` / `crawlPage` | Segue links HTML até o orçamento e extrai forms |
| `formVector` / `defaultFormMethod` | Form GET vira query; o resto fica form. Sem atributo `method`, form com senha vira POST e os outros GET. Método vazio já dentro de `formVector` vira POST |
| `lookupXMLRoot` | Busca o script da página para gravar a tag raiz do XML |
| `queryVectorFromHref` | Link com query vira vetor |
| `pageLooksLikeSPAShell` / `spaShellVector` | HTML sem links e com cara de app vira um vetor na própria URL |
| `pageOffersXML` / `xmlProbeFromForm` / `xmlRootFromSource` / `xmlScriptURL` | Detectam superfície XML e copiam campos do form |
| `scriptQueryVectors` / `attachClientQueryParams` | Parâmetros que só aparecem em script |
| `augmentStaticPage` | Aplica esses acréscimos na página estática |
| `NewRodCrawler` / `Discover` | Browser, rede, cliques e forms. Detalhe em [discovery.md](discovery.md) |
| `exploreBudget` / `settle` | Teto de tempo e espera depois de navegar, clicar ou submeter |
| `collectLinks` / `collectClickables` / `collectForms` | Leem o DOM já renderizado |
| `submitForm` / `clickCandidate` | Executam a interação, com os pulos de logout, pagamento e login |
| `finalizeVectors` | Mapa deduplicado vira a lista |
| `looksLikeLoginURL` / `looksLikeRegisterURL` / `looksLikeAuthFragment` | Evitam submeter tela de auth quando a sessão já existe |
| `networkVector` / `classifyTargetLocation` | Tráfego XHR/fetch vira vetor |
| `mergeJSONParams` / `mergeXMLParams` / `mergeGraphQLParams` | Copiam campos do corpo para `Params` |
| `connectBrowser` / `ConnectBrowser` / `attachCDP` / `launchChromium` | CDP existente ou Chromium novo |
| `resolveCDPControlURL` / `rewriteDebuggerHost` | Acham o WebSocket do DevTools e reescrevem o host para o da URL configurada |
| `injectBrowserAuth` / `writeStorage` / `storageOrigins` | Cookies e storage só na origem do alvo |
| `applyStealth` | User-Agent e plataforma antes da navegação |
| `cookieParamsFromAuth` e auxiliares de cookie | Traduzem cookies capturados para o protocolo do Chromium |
| `NewQueue` / `Enqueue` / `Dequeue` | Fila de prioridade por score |
| `NormalizeURL` / `SameOrigin` / `ResolveReference` | Comparação e resolução de URL |
| `IsBlockedDiscoveryURL` / `IsSkippableAsset` / `IsAttackableDiscoveryURL` | Blocklist e mesma origem |
| `Score` / `ScoreURL` | Prioridade da URL na fila |

## `internal/attack`

| Função | Faz |
|--------|-----|
| `MapVectorsToJobs` | Cruza vetor e catálogo. Pula `SECRET_LEAK` e campo de framework |
| `CapJobs` | Round-robin por vetor até `ATTACK_MAX_JOBS`, quando a variável está definida |
| `jobsForVector` / `payloadVariants` / `parsePayload` | Um job por campo e por valor do payload |
| `locationCompatible` | Locais equivalentes, e `HEADER` com qualquer vetor |
| `ApplyAuth` | Copia headers de sessão para o job, no escopo do alvo |
| `ApplyGlobalHeaders` | Copia um mapa extra. O pipeline não chama |
| `NewRestyEngine` | Cliente, timeout, user-agent, rate limit, sem seguir redirect de outra origem |
| `ExecutePool` / `executeJob` / `send` | Pool, cache de baseline, corte de corpo |
| `routeIsPublic` | GET sem credencial. `2xx` faz a categoria JWT ser pulada |
| `BuildBaseline` / `BuildAttack` / `BuildUnauthenticated` | Três montagens da mesma requisição |
| `build` e `buildQuery`, `buildPath`, `buildHeader`, `buildCookie`, `buildForm`, `buildJSON`, `buildXML`, `buildMultipart` | Um local cada. Local desconhecido cai em query |
| `BuildXMLProbe` | Segunda requisição do validador de XXE |
| `noneJWT` / `brokenJWT` / `bearerToken` | Token `alg=none` e token de assinatura inválida a partir do bearer da sessão |
| `applyPathPayload` / `encodeDotDotSegments` | Payload no último segmento do path |

## `internal/evidence`

`NewDefaultValidator` monta a cadeia. `Analyze` devolve o primeiro achado. `Close` fecha quem segura browser. `ToResultMessage` vira o JSON do achado. `newFinding` preenche o struct a partir da resposta.

Cada `New*Validator` constrói um elo. O `Analyze` correspondente está na tabela de [evidencia.md](evidencia.md). Funções em volta dele:

| Grupo | Funções | Papel |
|-------|---------|--------|
| path traversal | `confirmsLeakedFilename`, `looksLikeLeakedFile`, `basenameSurvivesReflection` | Separam vazamento de arquivo de reflexo do payload |
| regex | `sqlErrorIn`, `reflectedHTMLXSS`, `reflectedAPIXSS`, `unescapedReflection` | Assinatura de erro SQL e reflexo sem escape |
| SQL | `htmlFormLoginBypass`, `jsonLoginBypass`, `looksLikeSQLInjectionPayload` | Bypass de login e o filtro de payload |
| IDOR | `userDirectoryIDOR`, `pathObjectIDOR`, `massAssignment`, `defaultGET` | Três formas de confirmar objeto alheio, mais um GET de controle |
| CSRF | `csrfTokenStripped`, `crossSiteForgeryHeader`, `csrfEligibleMethod` | Token esvaziado ou Origin/Referer de outra origem |
| redirect | `headerRedirect`, `bodyRedirect`, `navigationConfirmsRedirect` | Header, link no corpo, e navegação no browser |
| SSTI / XXE | `siblingConfirms`, `entityExpansion`, `observe` | Segunda requisição para confirmar avaliação ou expansão |
| DOM | `shouldProbeDOMXSS`, `domSinkPresent`, `ensureBrowser` | Quando reabrir a página e o que conta como sink |
| diff / timing | `allowsDiffConfirmation`, `allowsTimingConfirmation` | Quais categorias ainda podem usar o critério genérico |
| sonda | `sendSpec` | HTTP das sondas extras de SSTI e XXE |

## `internal/secrets`

| Função | Faz |
|--------|-----|
| `NewHTTPScanner` / `Scan` | Até 40 GETs: raiz, `/api/config`, `/preview`, rotas descobertas e scripts same-origin |
| `get` | Um GET com os headers da sessão, corpo limitado |
| `scriptSources` | `src` de `<script>` resolvido na origem |
| `Find` | Aplica os padrões de token (Stripe, GitHub, AWS, Slack, Google, OpenAI, JWT). No máximo 8 ocorrências por padrão |
| `preferHits` / `dedupeHits` / `routePreference` | Um hit por token, preferindo a rota mais específica |
| `Evidence` | Texto do achado, com o valor truncado em 40 caracteres |
| `TruncateValue` | Corta o segredo exibido |

## `pkg/httputil` e `pkg/targeturl`

| Função | Faz |
|--------|-----|
| `CheckReachable` | GET de 15s. Erro de transporte falha; qualquer status HTTP passa |
| `CheckSameOriginRedirect` | Recusa redirect cujo host mudou |
| `DumpRequest` | Requisição em texto, com header sensível redatado |
| `Truncate` | Corta em limite de bytes sem partir rune UTF-8 |
| `RedactBody` | Mascara campos de senha, token e cartão em JSON e em form |
| `Normalize` | Se `TARGET_LOCALHOST_REWRITE` estiver setado, troca loopback por esse host |
| `AssertHTTP` | Exige http(s), host, sem userinfo, sem host proibido |
| `IsDisallowedHost` | Metadata do GCP e IP link-local |
| `Origin` | Scheme e host, sem path |
| `CanonicalSinkRoute` / `blankQuery` | Zera valores de query para deduplicar o achado |
| `UsesFragmentQuery` / `SplitFragment` | Query dentro de `#/rota?q=` |
| `LooksLikeHashRouter` / `LooksLikeSearchQueryRoute` | Pistas usadas pelo DOM XSS |

## `internal/goldset`

Não entra no binário do worker. O harness e `go test ./internal/goldset` usam.

| Função | Faz |
|--------|-----|
| `EvaluateReactLeaks` / `EvaluateAccess` / `EvaluateInject` | Rodam o motor real contra o handler do fixture e devolvem o relatório |
| `ReactLeakHandler` / `AccessHandler` / `InjectHandler` | Alvo vulnerável in-process |
| `PatchedAccessHandler` / `PatchedInjectHandler` | O mesmo alvo com o defeito fechado. O relatório tem que vir sem HIT |
| `Expected*Challenges` | Nomes que precisam aparecer |
| `Classify*` | Associa rota e categoria ao nome do desafio |
| `Report.Missing` | Desafios esperados que não tiveram HIT |
| `executeJobs` | Mapeia, executa e classifica com o validador padrão |
| `*JobPairs` / `AccessCatalogJobs` | Vetores e payloads fixos do gabarito, sem discovery |
