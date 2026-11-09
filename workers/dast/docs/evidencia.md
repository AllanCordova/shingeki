# Evidência

`evidence.Validator.Analyze` recebe a `Response` do ataque e devolve um `Finding` ou nil. `CompositeValidator` percorre a lista e fica com o **primeiro** não nil. Erro que não é timeout devolve nil na hora, sem consultar os outros.

Ordem em `NewDefaultValidator`:

1. path traversal
2. regex (erro SQL e reflexão de XSS)
3. bypass de autenticação SQL
4. boolean SQL por tamanho de corpo
5. IDOR
6. CSRF
7. redirect por header ou corpo HTTP
8. redirect confirmado no browser
9. JWT
10. SSTI
11. command injection
12. NoSQL
13. XXE
14. LDAP
15. diff de tamanho
16. timing
17. DOM XSS no browser

Cada validador filtra pela categoria (`strings.Contains` no nome em maiúsculas). `isClassicSQL` exige `SQL` e recusa `NOSQL`. Um achado de categoria errada não é produzido por outro validador, com uma exceção: o diff genérico só roda em categoria que **não** contém `PATH`, `XSS`, `SQL`, `IDOR`, `CSRF`, `COMMAND`, `SSRF`, `XXE`, `LDAP`, `SSTI`, `JWT` ou `REDIRECT`.

`Finding.ToResultMessage` copia os campos para o JSON do achado. A rota publicada pelo pipeline já passou por `CanonicalSinkRoute`.

## O que cada um confirma

| Validador | Confirma quando |
|-----------|-----------------|
| `PathTraversal` | o corpo do ataque contém marcador de arquivo que o baseline não tinha, e o nome pedido não é só reflexo do payload |
| `Regex` | categoria SQL com assinatura de erro no corpo, ou status de erro contra baseline saudável; categoria XSS com o payload refletido sem escape em HTML ou em JSON |
| `SQLAuthBypass` | payload com aspas, comentário ou `or`/`union`. No HTML, o baseline ainda mostra campo `password` e o ataque mostra link de logout. No JSON, o ataque é `2xx` e ganha JWT ou campo `token` que o baseline não tinha |
| `SQLBoolean` | ambos `2xx`, payload com cara de SQL, corpo do ataque pelo menos 500 bytes maior que o baseline |
| `IDOR` | troca de id de objeto com a mesma forma JSON e id diferente; diretório de usuários; ou mass assignment de campo de dono/papel que a resposta passa a ecoar. Pode fazer um GET extra de controle |
| `CSRF` | método de escrita (ou GET cuja rota contém `change-password`), pedido autenticado, `2xx`, e ou o campo de token foi esvaziado (`missing`, `null`, vazio, …) ou o campo injetado é `Origin`/`Referer` de outra origem |
| `Redirect` | `3xx` cujo `Location` sai do host, ou link no corpo apontando para o host do payload |
| `DOMRedirect` | a categoria é redirect, o HTTP não bastou, Rod está ligado, e a navegação no Chromium termina fora da origem. `Close` encerra o browser |
| `JWT` | ataque `2xx`, baseline `4xx` ou `5xx`, corpo com cara de recurso autenticado. A requisição em si (token `none` versus assinatura quebrada) foi montada no injector |
| `SSTI` | o primeiro payload avalia `7*7` para `49` sem deixar a expressão, e uma segunda requisição avalia `47*53` para `2491` |
| `Command` | marcador de saída de comando (`uid=`, `root:x:0:0:`, banner do Windows, …) só no corpo do ataque |
| `NoSQL` | bypass de login JSON com token, ou erro de Mongo/`ObjectId` com status `>= 500` ausente no baseline |
| `XXE` | marcador de arquivo local, ou expansão de entidade: o valor literal e a entidade interna produzem o mesmo efeito num campo que a aplicação devolve. A segunda sonda usa `BuildXMLProbe` |
| `LDAP` | assinatura de erro LDAP no ataque e não no baseline |
| `Diff` | diferença absoluta de tamanho de corpo acima de `EVIDENCE_BODY_DIFF_THRESHOLD` (default 100), só nas categorias sem validador próprio |
| `Timing` | categoria com `SQL` (não `NOSQL`), `TIME` ou `SLEEP`. O payload tem `sleep(N)`, `N` é maior que a tolerância, e a diferença de duração fica entre `N` menos e `N` mais `EVIDENCE_TIMING_TOLERANCE`. Se a requisição estourou timeout, basta passar do limite de baixo |
| `DOMXSS` | categoria XSS, Rod ligado, e a rota é hash router, search em `/#/`, ou o corpo parece HTML (JSON puro não é reaberto). O Chromium confirma dialog JS ou `iframe[src=javascript:]`. No `quick` o Rod está desligado e este passo não roda |

`sendSpec` (`evidence/probe.go`) é o cliente HTTP compartilhado pelas sondas extras de SSTI e XXE.

Nenhum validador reescreve o catálogo. Se a categoria do lote não contém o trecho que o validador procura, ele devolve nil e a tentativa fica `clean`, a menos que o diff genérico se aplique.
