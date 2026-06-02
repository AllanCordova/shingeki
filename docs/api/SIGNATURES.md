# API — Assinaturas digitais

Autorização de testes por token em meta tag HTML no alvo. Voltar ao [índice da API](../API.md).

Base: `/api/projects/{project}/systems/{system}/signatures`

## POST .../generate

Gera token de assinatura para o sistema.

**Resposta `201`:**

```json
{
  "message": "Signature token generated successfully.",
  "signature": {
    "id": "uuid",
    "user_id": "uuid",
    "system_id": "uuid",
    "ip_address": "127.0.0.1",
    "status": "active",
    "expiration": "...",
    "token": "64 caracteres hex",
    "created_at": "...",
    "updated_at": "..."
  },
  "installation": {
    "meta_name": "shingeki-signature",
    "example": "<meta name=\"shingeki-signature\" content=\"...\">"
  }
}
```

Instale a meta tag no HTML do `target_url` do sistema.

## POST .../validate

Verifica se o token ativo está presente no índice HTML do alvo.

**Resposta `200` (encontrado e permitido):**

```json
{
  "message": "Signature token found in system index.",
  "exists": true,
  "found_in_html": true,
  "permitted": true,
  "signature": { "...": "..." }
}
```

**Resposta `200` (token existe mas não no HTML):**

```json
{
  "message": "Signature token not found in system index.",
  "exists": true,
  "found_in_html": false,
  "permitted": false,
  "signature": { "...": "..." }
}
```

**Resposta `404`:** sem assinatura ativa para o sistema.

```json
{
  "message": "...",
  "exists": false,
  "permitted": false
}
```

O campo `token` **não** é retornado em validate (apenas em generate).

## POST .../revoke

Revoga a assinatura ativa do sistema.

**Resposta `200`:**

```json
{
  "message": "Signature token revoked successfully."
}
```

**Resposta `404`:** nenhuma assinatura ativa para revogar.

## Alvo de laboratório

No seed **Vulnerable PHP Target**, use o valor de `VULNERABLE_TARGET_SIGNATURE_TOKEN` nos `.env` (raiz e API). Exemplo padrão:

```json
{
  "signature_token": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
}
```

Esse valor é o `content` da meta tag após `generate`, não o ID da assinatura no banco.
