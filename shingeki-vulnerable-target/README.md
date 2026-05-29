# Shingeki Vulnerable Target (PHP)

Intentionally vulnerable PHP application for validating the Shingeki DAST pipeline.

## Vulnerabilities

| Attack catalog | Endpoint | Vector |
|----------------|----------|--------|
| `SQL_INJECTION` / `FORM` | `POST /login.php` | field `email` |
| `XSS` / `QUERY_PARAMETER` | `GET /search.php?q=` | reflected without encoding |
| `PATH_TRAVERSAL` / `URL_PATH` | `GET /browse/{file}` | reads files from `storage/` without sanitization |

## Run

```bash
docker compose up --build
```

App: http://localhost:8090

## Signature meta tag

Set `SHINGEKI_SIGNATURE_TOKEN` (64 chars) so the HTML includes:

```html
<meta name="shingeki-signature" content="...">
```

This matches the token seeded in `shingeki-api` for signature validation.

## Stack integration

When running inside `shingeki-api/docker-compose.yml`, the API seeder points the lab system to:

- `VULNERABLE_TARGET_URL=http://vulnerable-target` (recommended inside Docker network)
- or `http://host.docker.internal:8090` when the target is exposed on the host port
