# Treino DAST — OWASP Juice Shop

Alvo **Node + Angular SPA + Express + SQLite** para treinar o worker DAST além do lab PHP. Auto-hospedado, intencionalmente vulnerável, gabarito público. Não é produção e não substitui [vulnerable-target](shingeki-vulnerable-target.md).

## Como subir

Mesmo profile `stack` do lab PHP (porta **3001** para não colidir com o client Next.js em `:3000`):

```bash
docker compose --profile stack up -d
```

| Contexto | URL |
|----------|-----|
| Navegador / sistema no Shingeki | `http://127.0.0.1:3001` (`JUICE_SHOP_URL`) |
| Container | `http://juice-shop:3000` |

O worker Docker reescreve `localhost` / `127.0.0.1` para `host.docker.internal` (`TARGET_LOCALHOST_REWRITE`). Cadastre **só** a URL do browser.

Seed: sistema **OWASP Juice Shop** no projeto **Pentest Lab** (`JuiceShopSeeder`), stacks `express` (primária) e `angular`. Login Shingeki: [RUN-PROJECT.md](../RUN-PROJECT.md#credenciais-do-seed).

## Credenciais do alvo (Juice Shop)

Contas padrão da aplicação OWASP (não repetir noutros guias):

| E-mail | Senha | Uso |
|--------|-------|-----|
| `admin@juice-sh.op` | `admin123` | Sessão autenticada (extensão) |
| `jim@juice-sh.op` | `ncc-1701` | Segundo usuário (IDOR, fase posterior) |

## Gold set — rodada 2 (autenticado)

Nada do gabarito anônimo. O motor confirma **IDOR** com sessão (`Authorization: Bearer` após `POST /rest/user/login`). Harness (sem crawl, ~segundos):

```bash
npm run test:dast-juice-auth
# equivalente: go run -C workers/dast ./cmd/harness -target http://127.0.0.1:3001 -auth
# opcional: -email admin@juice-sh.op -password admin123
```

O harness faz login JSON, anexa o Bearer (o mesmo header que a extensão vai mandar) e pontua só estas linhas:

| Challenge | Rota | Categoria | Esperado |
|-----------|------|-----------|----------|
| Basket IDOR | `GET /rest/basket/{bid}` → id `2` | `IDOR` / `URL_PATH` | Hit — JSON de outro `UserId` com 200 |
| Admin users | `GET /api/Users/` | `IDOR` / `URL_PATH` | Hit — lista com ≥2 `email` (também acessível como `jim`, BAC) |
| Review IDOR | `PUT /rest/products/1/reviews` campo `author` | `IDOR` / `JSON_BODY` | Hit — autor estrangeiro persiste no GET da review |

UI depois: sessão da extensão + `admin@juice-sh.op` / `admin123`, catálogo re-seedado (`AttackCatalogSeeder` agora tem IDOR path + JSON), worker rebuild. Discovery com auth semeia basket, `/api/Users/` e reviews se o crawl não as gravar.

## Gold set — rodada 1 (anônimo)

Só o que o motor confirma sem sessão (catálogo genérico + regex SQL/XSS + bypass JSON JWT + DOM XSS via Rod + markers de path). Dispatch: `depth: full` (nunca `quick` — desliga Rod).

**Não use a UI para o loop de treino.** O crawl Rod leva ~5 min e a superfície anônima às vezes não abre `/#/login`. Harness (sem discovery):

```bash
npm run test:dast-juice
# equivalente: go run -C workers/dast ./cmd/harness -target http://127.0.0.1:3001
```

Re-seede o catálogo depois de puxar payloads novos: `php artisan db:seed --class=AttackCatalogSeeder`. Rebuild do worker para a UI: `docker compose --profile stack up -d --build dast-worker`.

| Challenge / vetor | Rota | Categoria | Esperado |
|-------------------|------|-----------|----------|
| Login Admin (SQLi) | `POST /rest/user/login` campo `email` | `SQL_INJECTION` / `JSON_BODY` | Hit — JWT no body vs 401 no baseline |
| Search SQLi (erro SQLite / UNION) | `GET /rest/products/search?q=` | `SQL_INJECTION` / `QUERY_PARAMETER` | Hit — HTML `SQLITE_ERROR` em 500, ou JSON bem maior em 200 (boolean) |
| DOM XSS no search | `GET /#/search?q=` payload iframe `javascript:alert(\`xss\`)` | `XSS` / `QUERY_PARAMETER` | Hit — dialog JS ou `iframe[src=javascript:]` no DOM (não no JSON da API) |
| LFI genérico (`/etc/passwd`) | path | `PATH_TRAVERSAL` | Miss esperado — Juice Shop não é o lab PHP |

**Ainda CTF (não DAST genérico):** puzzles, stego, score-board, cupom. CSRF fica no catálogo mas o motor ainda não confirma (risco de FP). SSTI/XXE/NoSQL têm payload + validador; neste Juice Shop SSTI no profile deu 401, XXE no upload está deprecated, NoSQL não aplica (SQLite).

## Gold set — rodada 3 (cobertura)

Catálogo agora tem **todas** as categorias DAST (SQL, XSS, path, IDOR, command, NoSQL, XXE, SSRF, LDAP, CSRF, open redirect, SSTI, JWT). O harness desta rodada pontua o que o Juice Shop confirma de fato:

```bash
npm run test:dast-juice-coverage
```

| Challenge | Rota | Esperado |
|-----------|------|----------|
| Open redirect | `GET /redirect?to=` prefix bypass `github.com/juice-shop/juice-shop.evil.invalid` | Hit — `Location` off-origin |
| JWT `none` | `GET /api/Users/` header `Authorization` | Hit — none 200 vs assinatura quebrada 401 |
| `/ftp` confidential | `GET /ftp/` → `acquisitions.md` | Hit — “This document is confidential” |

## Score do scan autenticado (UI + extensão)

Dispatch DAST `full` com sessão `admin@juice-sh.op`. Recall do gold set **fechado** (rodada 1 + 2). Os 15 findings são ~6 bugs únicos; o resto é variante de payload.

| Item | Resultado | Notas |
|------|-----------|--------|
| DOM XSS `#/search` | Hit | `<img onerror=alert(1)>` abriu dialog. TP. |
| Login SQLi | Hit | `' OR 1=1 --` / `' or 1=1--` → JWT. `')) OR 1=1--` → erro SQL. Mesmo bug. |
| Search SQLi | Hit | Dois payloads → `SQLITE_ERROR`. |
| Basket IDOR | Hit | `/rest/basket/2` e `/3` com outro `UserId`. TP. |
| Admin `/api/Users/` | Hit | Três payloads (1/2/3) no mesmo diretório. TP, ruído de variante. |
| Review IDOR `author` | Hit | `idor-harness@…` e `jim@…` no campo `author`. TP. |
| Review `message` = e-mail | Extra | O PUT gravou o e-mail como **texto** da review, não como autor. Não é IDOR. Corrigido no validador (só confirma `author` / `userId`). |
| LFI | Miss esperado | Sem finding path. |

## Score do dispatch `01a0597f-fdfe-72bf-b745-2e1bbcdc0ce0`

Scan anônimo `DAST` / `full`, 86 probes, 5 findings, ~5,5 min.

| Item do gold set | Resultado | Notas |
|------------------|-----------|--------|
| Login Admin SQLi | Hit | `' OR 1=1 --` e `' or 1=1--` devolveram JWT. `')) OR 1=1--` no login virou erro SQL (mesmo bug, outra evidência). |
| Search SQLi | Hit | `' OR 1=1 --` / `' or 1=1--` → `SQLITE_ERROR`. `')) OR 1=1--` foi 200 sem salto de tamanho (baseline `q=` já lista produtos). |
| DOM XSS search | Miss | XSS só foi ao `/rest/products/search` (JSON). `<script>alert(1)</script>` não é o sink; o challenge é iframe no hash `#/search`. Corrigido nesta rodada. |
| LFI | Miss esperado | 36 probes path, todos clean. |

Precisão: os 5 findings são TP do mesmo par login+search SQLi (payloads distintos, não FP). Discovery já via `/rest/user/login` e `/rest/products/search`.

## Score dos dispatches `01a05d3e…` e `01a05d48…` (2 findings)

Scan anônimo `full` de novo (~5,3 min). Só search SQLi. **Não é regressão de evidência**: o crawl **não descobriu** `POST /rest/user/login` nem `/#/search` (probes: home, admin-config, search API, `#/`). Sem vetor de login, o bypass JWT não roda. Sem `/#/search`, o DOM XSS não roda. O worker da UI precisa de rebuild para os vetores SPA; o discovery agora semeia `/rest/user/login` quando vê `/rest/` ou hash router.

## Como pontuar um scan

1. Anônimo `full` — o crawl vê `/rest/user/login`, `/rest/products/search` e `/#/search`? (rede passiva + vetor SPA).
2. Com sessão da extensão — rotas gravadas entram mesmo se o Chromium cair no login. Harness `-auth` cobre basket / `/api/Users/` / reviews sem crawl.
3. **Discovery:** vetores ∩ rotas da tabela. Com auth, o worker também semeia basket, users e reviews.
4. **Recall:** findings ∩ linhas com esperado Hit (rodada 1 anônima **ou** rodada 2 autenticada, não misturar).
5. **Precisão:** findings que não estão no gabarito. `DiffValidator` não confirma SQL/XSS/PATH/IDOR. Reflexão XSS só no JSON da API **não** conta como o challenge DOM.

Teto do worker: `ATTACK_MAX_JOBS` (2500). O catálogo desta rodada usa poucas variantes de propósito.

## Relação com o lab PHP

O lab em `:8090` continua o teste de regressão do pipeline (form login, `search.php?q=`, `../storage/secret.txt`). Os payloads genéricos incluem esses valores **sem** `field`/`parameter` lock. XSS refletido em HTTP no lab continua a ser confirmado pelo regex, sem precisar do Chromium.

Contrato de dispatch: [ATTACKS-AND-RESULTS.md](../api/ATTACKS-AND-RESULTS.md). Worker: [shingeki-dast-worker.md](shingeki-dast-worker.md).
