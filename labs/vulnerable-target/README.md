# Lab — alvo vulnerável (`labs/vulnerable-target`)

Alvo PHP vulnerável (laboratório) do monorepo Shingeki.

**Arquitetura, vetores e credenciais (fonte única):** [docs/architecture/shingeki-vulnerable-target.md](../../docs/architecture/shingeki-vulnerable-target.md)

**Como subir a stack:** [docs/RUN-PROJECT.md](../../docs/RUN-PROJECT.md)

## Uso rápido

- `POST /login.php` cria sessão PHP (`PHPSESSID`).
- No Shingeki: **Conectar ao alvo** (popup → `/shingeki-capture.php`). Contrato: [TARGET-SESSION.md](../../docs/api/TARGET-SESSION.md).
