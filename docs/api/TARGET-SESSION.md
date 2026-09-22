# API — Login do scanner (DAST autenticado)

O worker DAST entra no alvo **com o Chromium dele**, usando usuario e senha gravados no sistema. A sessao nasce no scan. Nao ha copia de cookie/token do Chrome da pessoa.

A extensao Chrome (`apps/extension`) e o fluxo `target-session/capture` **estao fora de uso**. Rotas antigas ainda existem no backend, mas o client nao as chama.

Voltar ao [indice da API](../API.md).

## Configurar no sistema

`POST /api/projects/{project}/systems` e `PUT .../systems/{system}` aceitam:

| Campo | Regras |
|-------|--------|
| `login_url` | Opcional. URL da pagina de login |
| `login_username` | Opcional. E-mail ou usuario do alvo |
| `login_password` | Opcional. Write-only; nunca volta na API |
| `logged_in_indicator` | Opcional. Texto visivel so depois do login |

A resposta do sistema inclui `login_configured: true|false` e `login_username`. Sem `login_password`.

`login_username` vazio no PUT limpa usuario e senha. Sem credenciais o DAST mapeia so a superficie publica.

Se o login estiver configurado e o worker nao conseguir entrar, o dispatch **falha** (`status: failed`, `failure_reason` com `scanner login`). Nao ha crawl anonimo silencioso.

## Dispatch

`POST .../attacks/dispatch` publica `auth` no batch quando o login esta configurado:

```json
{
  "auth": {
    "type": "credentials",
    "login_url": "https://alvo.exemplo.com/login",
    "username": "scanner@example.com",
    "password": "...",
    "logged_in_indicator": "Logout"
  }
}
```

A resposta inclui `scanner_login_configured: true|false`.

O worker:

1. Tenta login JSON (`POST /rest/user/login` e formatos `{token,access_token}`).
2. Se falhar, preenche o form no Chromium.
3. Crawla autenticado (links, cliques, XHR).
4. Reaproveita cookies/Bearer colhidos no browser para os ataques HTTP.

Se JSON e form falharem, o job termina como `failed`. O client mostra: "O scanner nao conseguiu entrar no alvo…".

## Labs

Seeders gravam credenciais de treino:

| Alvo | Login | Usuario | Senha |
|------|-------|---------|-------|
| Juice Shop | `{target}/#/login` | `admin@juice-sh.op` | `admin123` |
| Vulnerable PHP | `{target}/login.php` | `guest@vuln.local` | `guest123` |
