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

## Gold set desta rodada

Só o que o motor atual **pode** confirmar (catálogo genérico + regex SQL/XSS + bypass JSON JWT + markers de path). Dispatch: `depth: full` (nunca `quick` — desliga Rod).

| Challenge / vetor | Rota | Categoria | Esperado |
|-------------------|------|-----------|----------|
| Login Admin (SQLi) | `POST /rest/user/login` campo `email` | `SQL_INJECTION` / `JSON_BODY` | Hit — JWT no body vs 401 no baseline |
| Search SQLi (erro SQLite / UNION) | `GET /rest/products/search?q=` | `SQL_INJECTION` / `QUERY_PARAMETER` | Hit — HTML `SQLITE_ERROR` em 500, ou JSON bem maior em 200 (boolean) |
| Search XSS refletido em HTTP | `GET /rest/products/search?q=` | `XSS` / `QUERY_PARAMETER` | Hit só se o payload aparecer sem escape no body |
| LFI genérico (`/etc/passwd`) | path | `PATH_TRAVERSAL` | Miss esperado — Juice Shop não é o lab PHP |

**Fora desta rodada** (anotar como não coberto): DOM XSS, IDOR de basket, JWT `none`, XXE, SSTI, CSRF, NoSQL.

## Como pontuar um scan

1. Anônimo `full` — o crawl vê `/rest/user/login` e `/rest/products/search`? (rede passiva, sem hijack de `fetch`).
2. Com sessão da extensão — rotas gravadas entram mesmo se o Chromium cair no login.
3. **Discovery:** vetores ∩ rotas da tabela.
4. **Recall:** findings ∩ linhas com esperado Hit.
5. **Precisão:** findings que não estão no gabarito. `DiffValidator` não confirma SQL/XSS/PATH.

Teto do worker: `ATTACK_MAX_JOBS` (2500). O catálogo desta rodada usa poucas variantes de propósito.

## Relação com o lab PHP

O lab em `:8090` continua o teste de regressão do pipeline (form login, `search.php?q=`, `../storage/secret.txt`). Os payloads genéricos incluem esses valores **sem** `field`/`parameter` lock.

Contrato de dispatch: [ATTACKS-AND-RESULTS.md](../api/ATTACKS-AND-RESULTS.md). Worker: [shingeki-dast-worker.md](shingeki-dast-worker.md).
