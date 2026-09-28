# DAST worker (`workers/dast`)

Worker Go (DAST) do monorepo Shingeki.

**Arquitetura:** [docs/architecture/shingeki-dast-worker.md](../../docs/architecture/shingeki-dast-worker.md) · [site](https://allancordova.github.io/shingeki/architecture/shingeki-dast-worker/)

**Como rodar:** [docs/RUN-PROJECT.md](../../docs/RUN-PROJECT.md) · gabarito: [goldset](../../docs/architecture/shingeki-dast-goldset.md)

## Teste rápido (sem UI)

O dispatch pela UI faz crawl Rod. Para treinar evidência/catálogo, pule o discovery e rode o goldset in-process:

```bash
npm run test:dast
```

Isso corre `go test ./internal/goldset` (HIT e patched) e os três harness. Um de cada vez:

```bash
npm run test:dast-secrets
npm run test:dast-access
npm run test:dast-inject
```

Exit `0` se o gabarito fechar. Nenhum servidor Docker é necessário.
