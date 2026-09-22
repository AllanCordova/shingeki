# DAST worker (`workers/dast`)

Worker Go (DAST) do monorepo Shingeki.

**Arquitetura:** [docs/architecture/shingeki-dast-worker.md](../../docs/architecture/shingeki-dast-worker.md) · [site](https://allancordova.github.io/shingeki/architecture/shingeki-dast-worker/)

**Como rodar:** [docs/RUN-PROJECT.md](../../docs/RUN-PROJECT.md) · validar com labs: [Validar os workers](../../docs/RUN-PROJECT.md#validar-os-workers)

## Teste rápido (sem UI)

O dispatch pela UI faz crawl Rod (~5 min). Para treinar evidência/catálogo contra o Juice Shop, pule o discovery (o Juice Shop precisa estar no ar — profile `labs`):

```bash
# na raiz
npm run test:dast-juice
npm run test:dast-juice-auth        # IDOR basket (incl. jim /2), admin users, reviews
npm run test:dast-juice-coverage    # redirect, JWT none, /ftp, CSRF change-password

# ou
cd workers/dast
go run ./cmd/harness -target http://127.0.0.1:3001
go run ./cmd/harness -target http://127.0.0.1:3001 -dom-xss
go run ./cmd/harness -target http://127.0.0.1:3001 -auth
go run ./cmd/harness -target http://127.0.0.1:3001 -coverage
```

Exit `0` se o gabarito da flag fechar. Sem flags: login SQLi + search SQLi. `-dom-xss` exige o iframe no `#/search`. `-auth` é IDOR autenticado (basket próprio e o do jim). `-coverage` é redirect + JWT `none` + `/ftp` + CSRF em change-password. Juice Shop em `:3001`.
