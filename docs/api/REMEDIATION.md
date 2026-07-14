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

## POST .../remediate/github-pr/preview

`POST /api/projects/{project}/systems/{system}/remediate/github-pr/preview`

Gera um **preview** das alterações (diff por arquivo, branches, título) **sem** commitar nem abrir PR. Mesmo body e validações de `github-pr`. Rate limit: **10 requisições/minuto**.

Resposta inclui `files` (before/after por arquivo), `can_submit`, `skipped_files` e metadados do PR planejado.

## POST .../remediate/github-pr

`POST /api/projects/{project}/systems/{system}/remediate/github-pr`

Abre um pull request no GitHub com correções geradas pela IA para achados **SAST**. Rate limit: **5 requisições/minuto**.

**Body (JSON):**

| Campo | Descrição |
|-------|-----------|
| `finding_ids` | UUIDs de `system_results` (obrigatório, máx. 10) |
| `dispatch_id` | UUID do disparo SAST concluído |
| `regenerate` | `true` para ignorar cache de sugestões IA |
| `title` | Título customizado do PR |
| `base_branch` | Branch base (padrão `GITHUB_DEFAULT_BRANCH` ou `main`) |

**Pré-requisitos:**

- `repository_url` do sistema apontando para GitHub
- `GITHUB_TOKEN` com escopo `repo` (ou permissões de conteúdo + PR no repositório)
- `GEMINI_API_KEY` ou `GROQ_API_KEY` (mesmo fluxo de `remediate/ai`)
- Disparo **SAST** concluído; achados com sugestão IA `syntax_valid: true`

**Fluxo:**

1. Gera ou reutiliza sugestões IA (`AiRemediationService`)
2. Agrupa patches por arquivo (`CodePatchApplier`)
3. Reseta a branch `fix-security-{dispatch}` para a base no GitHub (`ensureBranchAt`, evita empilhar patches)
4. Aplica patches a partir do conteúdo da branch base e **valida cada arquivo**:
   - `php -l` no arquivo inteiro (sintaxe)
   - o trecho vulnerável original não pode permanecer no arquivo (fix incompleto)
   - o bloco de correção não pode aparecer duplicado
   - arquivos que falham são **pulados** (`skipped_files`) e não são commitados
5. Commita só os arquivos validados e abre PR
6. Persiste registro em `github_remediation_pull_requests`

> Se nenhum arquivo passar na validação, a API responde `422` com o motivo por achado — em vez de criar um PR que o SAST continuará apontando.

**Resposta `201`:**

```json
{
  "message": "GitHub pull request created successfully.",
  "pull_request": {
    "id": "uuid",
    "number": 42,
    "url": "https://github.com/org/repo/pull/42",
    "head_branch": "fix-security-a1b2c3d4",
    "base_branch": "main"
  },
  "files_changed": 2,
  "findings_applied": 3,
  "provider": "gemini",
  "model": "gemini-2.0-flash"
}
```

### Variáveis de ambiente (GitHub)

| Variável | Descrição |
|----------|-----------|
| `GITHUB_TOKEN` | Personal access token ou token de GitHub App |
| `GITHUB_DEFAULT_BRANCH` | Branch base para PR (padrão `main`; repo [AllanCordova/vulnerable-target](https://github.com/AllanCordova/vulnerable-target) usa `master`) |
| `GITHUB_REPOSITORY_SOURCE_PREFIX` | Prefixo no repo GitHub quando o SAST escaneia só a subpasta (ex.: `shingeki-vulnerable-target`) |
| `GITHUB_REMEDIATION_BRANCH_PREFIX` | Prefixo da branch (padrão `fix-security`) |

## Historico do sistema

`GET /api/projects/{project}/systems/{system}/remediation-history`

Timeline unificada de eventos do sistema (ataques, remediacoes e PRs do fluxo Shingeki):

| Tipo | Origem |
|------|--------|
| `scan_completed` / `scan_clean` | Disparos concluidos |
| `catalog_suggestion` | Clique em **Gerar correcoes** (1 evento por acao, pagina 1) |
| `ai_suggestion` | Clique em **Sugerir com IA** (1 evento por acao, nao por achado) |
| `github_pr` | PRs abertos via remediacao GitHub |

**Query:**

| Param | Padrao | Descricao |
|-------|--------|-----------|
| `page` | `1` | Pagina |
| `per_page` | `25` | Itens (max. 100). Preview no client usa 5; pagina completa usa 30 |
| `from` | — | Data inicial (`YYYY-MM-DD`) |
| `to` | — | Data final (`YYYY-MM-DD`) |
| `type` | — | `catalog_suggestion` (remediacao comum), `ai_suggestion`, `attack` (`scan_completed`/`scan_clean`), `github_pr` |

**Resposta:** `{ events, pagination }`.

## Client web

No formulario do sistema, selecione as stacks. Na pagina do sistema ou do disparo:

- **Gerar correcoes** — catalogo sincrono (`POST .../remediate`).
- **Sugerir com IA** — LLM com toggle entre visoes *Shingeki remediacoes* e *IA*.
- **Abrir PR no GitHub** — preview com diff (`POST .../remediate/github-pr/preview`), depois confirmacao (`POST .../remediate/github-pr`) para achados SAST com sugestao IA valida.
- **Historico do sistema** — preview com 5 eventos na pagina do sistema; rota `/historico-remediacao` com paginacao (30), filtro de datas (datepicker) e filtro por tipo. Inclui scans, correcoes, IA e PRs abertos via remediacao GitHub do produto (nao o historico completo do repositorio).
- **Remover** — excluir disparo individual ou todos (modais de confirmacao).
