# Shingeki Vulnerable Target (PHP)

Intentionally vulnerable PHP application for validating the Shingeki DAST pipeline.

Documentação geral e stack Docker: [README na raiz](../README.md).

## Vulnerabilities

| Attack catalog | Endpoint | Vector |
|----------------|----------|--------|
| `SQL_INJECTION` / `FORM` | `POST /login.php` | field `email` |
| `XSS` / `QUERY_PARAMETER` | `GET /search.php?q=` | reflected without encoding |
| `PATH_TRAVERSAL` / `URL_PATH` | `GET /browse/{file}` | reads files from `storage/` without sanitization |

## Signature meta tag

Set `SHINGEKI_SIGNATURE_TOKEN` (64 chars) so the HTML includes:

```html
<meta name="shingeki-signature" content="...">
```

This matches `VULNERABLE_TARGET_SIGNATURE_TOKEN` in the root `.env` and the token seeded in `shingeki-api`.

## Stack integration

When running `docker compose up` from the monorepo root, the API seeder points the lab system to:

- `VULNERABLE_TARGET_URL=http://host.docker.internal:8090` (API on host)
- or `http://vulnerable-target` when both services share the Docker network
