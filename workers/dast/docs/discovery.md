# Discovery

Pacote `internal/discovery`. A interface usada pelo pipeline é `Engine.Discover`. A implementação única em produção é `CompositeEngine`.

## Caminho com `route_map`

`discoverRouteMap` chama `VectorsFromRouteMap` e devolve só isso. Não há crawl, não há Rod e não há corte por `depth`. Lista vazia falha o lote.

`VectorsFromRouteMap` resolve cada path na origem do alvo, exige same-origin e produz:

- sempre `URL_PATH`;
- `QUERY_PARAMETER` se houver query, com os pares em `Params`;
- `JSON_BODY` se houver body ou se o método for `POST`/`PUT`/`PATCH`/`DELETE`.

Placeholder `{nome}` é obrigatório ter valor seguro. Método vazio vira `GET`.

## Caminho com crawl

`ApplyDepthAndScope` primeiro aplica `depth`, depois `max_routes`.

`quick`: profundidade 1, 12 páginas, 20 cliques, 3 submits, settle 800ms, **Rod desligado**. `full`: usa o que veio do env.

`max_routes > 0` sobrescreve `MaxPages`. `ResolveSeedURL` junta `start_path` à origem. URL absoluta só é aceita no mesmo scheme e host. O fragmento é removido da semente HTTP (o hash router entra por outro caminho, nos links `#/…`).

Ordem dentro de `Discover`:

1. Se Rod está ligado, `RodCrawler.Discover`. Qualquer erro do Rod cai só no crawl estático.
2. Se o Rod voltou vetores, o Colly roda mesmo assim e `mergeAttackVectors` junta os dois. A chave é `método + rota + target_location`. Campo vazio de um lado é preenchido pelo outro (`MergeVector`). Abaixo de `DISCOVERY_MIN_VECTORS_FOR_ROD` (default 2) o log avisa que o estático cobriu a lacuna; os vetores dinâmicos não são descartados.
3. Rod desligado: só Colly.
4. `AppendRecordedRoutes` soma URLs gravadas em `auth.routes` que ainda não estão na lista, se passarem na blocklist.
5. Lista vazia: um único vetor `GET` `URL_PATH` na semente (`fallbackVectors`).
6. `CanonicalizeQueryVectors` normaliza a query e funde parâmetros do mesmo sink.
7. `FilterAttackable` tira URL fora da origem atacável e o que a blocklist recusa.
8. `CapVectors`: se há `max_routes`, corta nesse número. Senão, no `quick`, corta em 20. `full` sem `max_routes` não corta a lista de vetores (o corte de páginas já aconteceu no crawl).

## Rod (`discovery/dynamic`)

`RodCrawler.Discover` não faz nada se `RodEnabled` é falso. Caso contrário:

- `connectBrowser`: se `DISCOVERY_CDP_URL` responde, anexa nesse Chrome; se a porta falha, lança o Chromium do `CHROME_PATH`. Flags: headless, no-sandbox, `DISCOVERY_PROXY`.
- Uma página, network domain ligado. Cada `NetworkRequestWillBeSent` passa por `networkVector`.
- `injectBrowserAuth` aplica cookies e storage só em origens do alvo. Não preenche formulário de login.
- Fila BFS começa na semente e nas `auth.routes`. Score em `bfs.Score`: termos de API, admin e identificador sobem; blog, faq e paginação descem.
- Em cada página, dentro do orçamento (`MaxPages`, `MaxClicks`, `MaxFormSubmits`, settle, timeout de página e um teto de exploração): coleta links, clica `a`, `button`, `role=button|link`, `onclick` e submits, preenche form com dicionário fictício e submete. Logout, pagamento e login (quando já há sessão) são pulados.
- `finalizeVectors` devolve o mapa deduplicado.

`networkVector` ignora `OPTIONS` e `HEAD`. `classifyTargetLocation`:

| Sinal | `target_location` |
|-------|-------------------|
| corpo ou path GraphQL | `JSON_BODY` |
| `Content-Type` XML ou corpo que parece XML | `XML_BODY` (e `XMLRoot` se achar a tag raiz) |
| JSON | `JSON_BODY` |
| GET com query | `QUERY_PARAMETER` |
| GET sem query | `URL_PATH` |
| form urlencoded ou multipart | `FORM` |
| outro método de escrita | `API_ENDPOINT` |

Corpo de rede é truncado e campos sensíveis passam por `RedactBody` antes de ir para o vetor. A sessão do crawl é a que já veio no lote. O worker não preenche formulário de login nem de cadastro.

## Colly (`discovery/static`)

`CollyCrawler.Discover` segue `href` até `MaxDepth` / `MaxPages`, com os headers de auth same-origin. Cada HTML vira vetores de link com query (`queryVectorFromHref`), forms (`formVector`: GET vira `QUERY_PARAMETER`, o resto `FORM`) e, se a página parece shell de SPA ou oferece XML, os acréscimos de `surface.go`:

- `spaShellVector` na própria URL;
- `scriptQueryVectors` / `attachClientQueryParams` para parâmetros que só aparecem em script;
- `xmlProbeFromForm` copia campos de um form para um vetor `XML_BODY` quando `pageOffersXML`;
- `lookupXMLRoot` busca o script referenciado para gravar `XMLRoot`.

## Blocklist (`discovery/bfs`)

`IsBlockedDiscoveryURL` recusa scheme fora de http(s), hosts de analytics e suporte, prefixos `/cdn-cgi/`, locales, assets, `socket.io`, `wp-includes` e conteúdo estático de tema/plugin, e os paths exatos `favicon.ico`, `robots.txt`, `sitemap.xml`. `IsSkippableAsset` recusa extensão de arquivo estático. `IsAttackableDiscoveryURL` exige não bloqueada e mesma origem registrável (`SameOrigin`, com `www` equivalente).

`Queue` é um heap. `Enqueue` normaliza, deduplica e ordena por score e profundidade. `NormalizeURL` tira fragmento na comparação de visita, mas os vetores de hash são gravados à parte quando o coletor de links vê `#/…`.
