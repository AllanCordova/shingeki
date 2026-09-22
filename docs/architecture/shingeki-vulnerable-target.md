# Lab — alvo vulnerável (`labs/vulnerable-target`)

Aplicação **PHP** intencionalmente vulnerável para **treino local** do pipeline DAST. Não é produção e **não** faz parte da arquitetura do worker — o DAST só vê o `target_url` do dispatch.

Como subir este alvo (profile `labs`): [Validar os workers](../RUN-PROJECT.md#validar-os-workers). Desenho do worker: [shingeki-dast-worker.md](shingeki-dast-worker.md).

## Papel

- Seed da API: sistema **Vulnerable PHP Target** no projeto **Pentest Lab**.
- O worker autentica com **login do scanner** (usuário/senha no sistema), não com captura de cookie. Contrato: [TARGET-SESSION.md](../api/TARGET-SESSION.md).
- Aceite de responsabilidade no dispatch: [ATTACK-ACKNOWLEDGMENT.md](../api/ATTACK-ACKNOWLEDGMENT.md).

## Vetores expostos

### Rotas públicas

| Categoria (catálogo) | Endpoint | Vetor |
|------------------------|----------|--------|
| `SQL_INJECTION` / `FORM` | `POST /login.php` | campo `email` |
| `XSS` / `QUERY_PARAMETER` | `GET /search.php?q=` | reflexão sem encoding |
| `PATH_TRAVERSAL` / `URL_PATH` | `GET /browse/{file}` | leitura em `storage/` sem sanitização |

### Rotas autenticadas (sessão PHP)

Requer login no alvo. No Shingeki, grave as credenciais no card **Login do scanner**.

| Categoria | Endpoint | Vetor |
|-----------|----------|--------|
| `SQL_INJECTION` / `FORM` | `POST /profile.php` | campo `email` (UPDATE vulnerável) |
| `XSS` / `QUERY_PARAMETER` | `GET /notes.php?q=` | reflexão sem encoding |
| `PATH_TRAVERSAL` / `URL_PATH` | `GET /app/browse/{file}` | leitura em `storage/` sem sanitização |

Credenciais demo (fonte única — não repetir em outros guias):

| E-mail | Senha | Papel no lab |
|--------|-------|----------------|
| `guest@vuln.local` | `guest123` | Convidado |
| `admin@vuln.local` | `super-secret` | Administrador do alvo |

O vhost Apache (`apache-vhost.conf`) usa `AllowEncodedSlashes NoDecode` para o vetor de path traversal com barras percent-encoded.

Cada endpoint existe para disparar um tipo de evidência que o worker valida (erro SQL, script refletido, conteúdo de arquivo).

## URLs de treino

| Contexto | URL |
|----------|-----|
| Navegador / sistema no Shingeki | `http://127.0.0.1:8090` |
| Rede Docker (só dentro da compose) | `http://vulnerable-target` |

Cadastre a URL do browser. O worker em Docker reescreve loopback via `TARGET_LOCALHOST_REWRITE`.

## Limites de escopo

- Login PHP com sessão (`PHPSESSID`) para rotas autenticadas; o scanner usa form no Chromium.
- `public/shingeki-capture.php` é residual da captura antiga — o produto não usa mais.
- O HTML ainda pode emitir `<meta name="shingeki-signature">` se `SHINGEKI_SIGNATURE_TOKEN` estiver no container — residual; a API **não** valida essa meta.
- Vulnerabilidades fixas e documentadas; não simula aplicação real completa.
