# API — Remediação (snippets)

Sugestões de correção para achados **já persistidos** em `system_results`. Voltar ao [índice da API](../API.md).

## POST .../remediate

`POST /api/projects/{project}/systems/{system}/remediate`

Gera snippets de correção para os achados de um disparo concluído.

**Body (JSON, opcional):**

| Campo | Descrição |
|-------|-----------|
| `dispatch_id` | UUID do disparo. Se omitido, usa o **último disparo concluído** do sistema. |

**Fluxo:**

1. Autoriza acesso (`remediate` na policy do sistema).
2. Exige pelo menos uma stack em `system_stack` (ver [STACKS.md](STACKS.md)).
3. Resolve o disparo (informado ou último concluído).
4. Carrega `SystemResult` desse disparo.
5. Para cada achado, `RemediationResolver` busca snippets em `remediations` × stacks do sistema.
6. Retorna `200` com a lista de achados e sugestões.

**Resposta `200`:**

```json
{
  "message": "Remediation suggestions generated.",
  "system_id": "uuid",
  "dispatch_id": "uuid",
  "stacks": [
    { "id": "uuid", "slug": "laravel", "name": "Laravel" }
  ],
  "findings_count": 2,
  "findings": [
    {
      "system_result_id": "uuid",
      "attack_dispatch_id": "uuid",
      "scan_type": "SAST",
      "vulnerable_route": "app/User.php:42",
      "payload_used": "php.lang.security.sql-injection",
      "evidence": null,
      "http_request": null,
      "attack": {
        "id": "uuid",
        "category": "SQL_INJECTION",
        "target_location": "BODY",
        "risk_level": "HIGH"
      },
      "remediations": [
        {
          "stack": { "id": "uuid", "slug": "laravel", "name": "Laravel" },
          "title": "Use query builder bindings",
          "description": "...",
          "code_snippet": "User::where('id', $id)->first();",
          "references": []
        }
      ]
    }
  ]
}
```

**Erros:**

| Status | Situação |
|--------|----------|
| `403` | Sem permissão |
| `422` | Sistema sem stacks configuradas |
| `422` | Nenhum disparo concluído disponível |
| `422` | Nenhum achado para o disparo selecionado |

## Lookup de snippets (`remediations`)

O catálogo associa cada snippet a uma `stack_id` e critérios de match:

| Coluna | Uso |
|--------|-----|
| `stack_id` | Framework/stack (ver [STACKS.md](STACKS.md)) |
| `scan_type` | `DAST`, `SAST` ou `null` (ambos) |
| `attack_category` | Match DAST; fallback SAST |
| `semgrep_rule_id` | Match exato SAST (`payload_used` = `check_id` Semgrep) |
| `title`, `description`, `code_snippet`, `references` | Conteúdo exibido |

**Prioridade de match:**

1. **SAST:** `semgrep_rule_id` + `stack_id`
2. **SAST (fallback):** `attack_category` + `stack_id` + linguagem inferido da extensão do arquivo
3. **DAST:** `attack.category` + `stack_id`

Um achado pode retornar múltiplos snippets (um por stack do sistema que tiver entrada no catálogo).

Catálogo populado por `RemediationCatalogSeeder` (ex.: `PATH_TRAVERSAL` + `vanilla_php` para o alvo de laboratório).

## Client web

No formulário do sistema, selecione as stacks. Na página do sistema ou do disparo, use **Gerar correções** para chamar este endpoint de forma síncrona.
