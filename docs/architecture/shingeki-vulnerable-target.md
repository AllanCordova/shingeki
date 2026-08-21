# Lab — alvo vulnerável (`labs/vulnerable-target`)

Aplicação **PHP** intencionalmente vulnerável para validar o pipeline DAST em ambiente de laboratório. Não é produção — expõe vetores fixos alinhados ao catálogo de ataques da API.

## Papel no monorepo

- Alvo HTTP referenciado pelo sistema **Vulnerable PHP Target** (seed da API).
- Usado pelo worker DAST após o dispatch (aceite de responsabilidade na API — ver [ATTACK-ACKNOWLEDGMENT.md](../api/ATTACK-ACKNOWLEDGMENT.md)).
- URLs usadas pelo worker dependem do contexto (host vs rede Docker) — ver [ATTACKS-AND-RESULTS.md](../api/ATTACKS-AND-RESULTS.md) para o mapa host/Docker; este documento descreve apenas o desenho do alvo.

## Vetores expostos

### Rotas públicas

| Categoria (catálogo) | Endpoint | Vetor |
|------------------------|----------|--------|
| `SQL_INJECTION` / `FORM` | `POST /login.php` | campo `email` |
| `XSS` / `QUERY_PARAMETER` | `GET /search.php?q=` | reflexão sem encoding |
| `PATH_TRAVERSAL` / `URL_PATH` | `GET /browse/{file}` | leitura em `storage/` sem sanitização |

### Rotas autenticadas (sessão PHP)

Requer login e, no Shingeki, **sessão do alvo** importada ([TARGET-SESSION.md](../api/TARGET-SESSION.md)) para o worker DAST acessar com cookie.

| Categoria | Endpoint | Vetor |
|-----------|----------|--------|
| `SQL_INJECTION` / `FORM` | `POST /profile.php` | campo `email` (UPDATE vulnerável) |
| `XSS` / `QUERY_PARAMETER` | `GET /notes.php?q=` | reflexão sem encoding |
| `PATH_TRAVERSAL` / `URL_PATH` | `GET /app/browse/{file}` | leitura em `storage/` sem sanitização |

Fluxo de captura externa: popup abre `login.php?next=/shingeki-capture.php?ticket=...` → login define `PHPSESSID` → redirect captura cookie para a API.

Credenciais demo (fonte única — não repetir em outros guias):

| E-mail | Senha | Papel no lab |
|--------|-------|----------------|
| `guest@vuln.local` | `guest123` | Convidado |
| `admin@vuln.local` | `super-secret` | Administrador do alvo |

O vhost Apache (`apache-vhost.conf`) usa `AllowEncodedSlashes NoDecode` para o vetor de path traversal com barras percent-encoded.

Cada endpoint existe para disparar um tipo de evidência que o worker valida (erro SQL, script refletido, conteúdo de arquivo).

## Integração com a stack

| Contexto | URL típica do alvo |
|----------|-------------------|
| API/worker no host (`php artisan serve`) | `http://127.0.0.1:8090` |
| Rede Docker (`docker compose`) | `http://vulnerable-target` |

O seed do Laravel aponta o sistema de laboratório para a URL adequada ao modo de execução. O worker DAST acessa o mesmo `target_url` recebido no batch RabbitMQ.

## Limites de escopo

- Login PHP com sessão (`PHPSESSID`) para rotas autenticadas de laboratório; integração com captura Shingeki via `/shingeki-capture.php`.
- Sessão do alvo autoriza rotas protegidas no DAST; o dispatch na API exige aceite de responsabilidade (não depende de meta tag no alvo).
- O HTML ainda pode emitir `<meta name="shingeki-signature">` se `SHINGEKI_SIGNATURE_TOKEN` estiver no container — residual; a API **não** valida essa meta. Ver [ATTACK-ACKNOWLEDGMENT.md](../api/ATTACK-ACKNOWLEDGMENT.md).
- Vulnerabilidades fixas e documentadas; não simula aplicação real completa.
- Evidências pensadas para testes automatizados do [DAST worker](shingeki-dast-worker.md).
