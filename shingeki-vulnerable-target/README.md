# shingeki-vulnerable-target

Alvo PHP vulnerável (laboratório) do monorepo Shingeki.

**Arquitetura:** [docs/architecture/shingeki-vulnerable-target.md](../docs/architecture/shingeki-vulnerable-target.md) · [site](https://allancordova.github.io/shingeki/architecture/shingeki-vulnerable-target/)

**Ambiente de testes:** [docs/api/ATTACKS-AND-RESULTS.md](../docs/api/ATTACKS-AND-RESULTS.md)

## Login e rotas autenticadas

- `POST /login.php` cria sessão PHP (`PHPSESSID`) após credenciais válidas.
- Use **Conectar ao alvo** no Shingeki (popup → login → captura automática via `/shingeki-capture.php`).
- Rotas protegidas: `/dashboard.php`, `/profile.php`, `/notes.php`, `/app/browse/{file}`.
- Usuários demo: `guest@vuln.local` / `guest123`, `admin@vuln.local` / `super-secret`.
