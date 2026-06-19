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

O catálogo associa cada snippet a uma `stack_id`, critérios de match e `user_id` (autor). Gerenciamento via [CATALOG.md](CATALOG.md) e import CSV em [CATALOG-BULK-IMPORT.md](CATALOG-BULK-IMPORT.md).

| Coluna | Uso |
|--------|-----|
| `stack_id` | Framework/stack (ver [STACKS.md](STACKS.md)) |
| `user_id` | Autor do snippet (ownership na API de catálogo) |
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

## POST .../remediate/ai

`POST /api/projects/{project}/systems/{system}/remediate/ai`

Gera sugestões de correção via LLM (Gemini ou Groq) com contexto de código extraído do repositório ou heurísticas DAST. Rate limit: **10 requisições/minuto** por usuário.

**Body (JSON, opcional):**

| Campo | Descrição |
|-------|-----------|
| `dispatch_id` | UUID do disparo. Se omitido, usa o último disparo concluído. |
| `finding_ids` | Lista de UUIDs de `system_results` (máx. 10). |
| `regenerate` | `true` para ignorar cache e chamar o LLM novamente. |

**Pré-requisitos:**

- Pelo menos uma stack no sistema.
- Disparo concluído com achados.
- Variável de ambiente `GEMINI_API_KEY` ou `GROQ_API_KEY` (ver `config/ai.php` e `.env.example`).

**Fluxo:**

1. Autoriza acesso (`remediate` na policy do sistema).
2. Resolve achados do disparo (até `AI_MAX_FINDINGS_PER_REQUEST`, padrão 5).
3. `SourceContextService` obtém trecho de código (GitHub raw, evidência SAST ou heurística DAST).
4. `AiPromptBuilder` monta prompt por stack (`resources/ai/prompts/{slug}.md`).
5. LLM retorna JSON validado; resultado é cacheado em `ai_remediation_suggestions`.

**Resposta `200`:**

```json
{
  "message": "AI remediation suggestions generated.",
  "system_id": "uuid",
  "dispatch_id": "uuid",
  "provider": "gemini",
  "model": "gemini-2.0-flash",
  "stacks": [{ "id": "uuid", "slug": "laravel", "name": "Laravel" }],
  "findings_count": 1,
  "findings": [
    {
      "system_result_id": "uuid",
      "attack_dispatch_id": "uuid",
      "scan_type": "SAST",
      "vulnerable_route": "app/User.php:42",
      "source_context": {
        "excerpt": "...",
        "file": "app/User.php",
        "line": 42,
        "origin": "repository"
      },
      "ai_suggestion": {
        "root_cause": "...",
        "risk_summary": "...",
        "suggested_fix": {
          "description": "...",
          "code": "..."
        },
        "validation": {
          "why_this_fixes": "...",
          "confidence": "high",
          "syntax_valid": true
        },
        "references": ["https://owasp.org/..."]
      },
      "cached": false
    }
  ]
}
```

**Erros adicionais:**

| Status | Situação |
|--------|----------|
| `503` | Nenhum provider de IA configurado ou falha na chamada ao LLM |

### Variáveis de ambiente (IA)

| Variável | Descrição |
|----------|-----------|
| `AI_PROVIDER` | `gemini` (padrão) ou `groq` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Credenciais Google Gemini |
| `GROQ_API_KEY` / `GROQ_MODEL` | Credenciais Groq |
| `AI_MAX_FINDINGS_PER_REQUEST` | Limite de achados por request (padrão 5) |
| `AI_SOURCE_LINE_WINDOW` | Linhas de contexto ao redor do achado SAST |
| `AI_SOURCE_DEFAULT_BRANCH` | Branch Git para fetch raw (padrão `main`) |

## Client web

No formulário do sistema, selecione as stacks. Na página do sistema ou do disparo:

- **Gerar correções** — catálogo síncrono (`POST .../remediate`).
- **Sugerir com IA** — LLM com toggle entre visões *Shingeki remediações* e *IA*.
- **Remover** — excluir disparo individual ou todos (modais de confirmação).
