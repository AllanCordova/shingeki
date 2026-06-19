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

## Uso no dispatch de ataques

Após **generate** e **validate** (com `permitted: true`), o dispatch DAST/SAST não exige mais o token no body. A API localiza a assinatura ativa do usuário para o sistema e valida expiração e permissão.

Erros comuns no dispatch:

| Mensagem | Situação |
|----------|----------|
| `No signature token found for this system.` | Nenhuma assinatura gerada |
| `Signature token has expired.` | Token expirado — gere um novo |
| `Signature token is not permitted for attacks.` | Meta tag ainda não validada no alvo |

## Alvo de laboratório

No seed **Vulnerable PHP Target**, o `content` da meta tag após `generate` deve coincidir com `VULNERABLE_TARGET_SIGNATURE_TOKEN` nos `.env` (raiz e API). Exemplo padrão (64 caracteres hex):

```
bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
```

Esse valor é o `content` da meta tag após `generate`, não o ID da assinatura no banco.
