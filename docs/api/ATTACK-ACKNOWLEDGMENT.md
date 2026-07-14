# API — Aceite de responsabilidade (dispatch)

Antes de enfileirar ataques DAST/SAST, o usuário deve declarar responsabilidade e aceitar os termos legais. Não há endpoints separados de assinatura: o aceite vai no **body do dispatch**. Voltar ao [índice da API](../API.md).

Constantes em `App\Support\AttackAcknowledgmentTerms`:

| Constante | Valor |
|-----------|--------|
| `RESPONSIBILITY_CODE` | `SHINGEKI-ATTACK-ACK-1` |
| `VERSION` (`terms_version`) | `2026-07-13` |

## Body obrigatório no dispatch

Usado em:

- `POST .../attacks/dispatch` (DAST)
- `POST .../attacks/dispatch/sast` (SAST)

```json
{
  "accepted_responsibility": true,
  "accepted_legal_terms": true,
  "terms_version": "2026-07-13"
}
```

| Campo | Regra |
|-------|--------|
| `accepted_responsibility` | obrigatório; deve ser aceito (`true`) |
| `accepted_legal_terms` | obrigatório; deve ser aceito (`true`) |
| `terms_version` | obrigatório; deve ser exatamente a versão atual (`2026-07-13`) |

**Resposta `422`:** aceite ausente/falso ou `terms_version` desatualizada (ex.: `Acknowledgment terms version is outdated. Refresh and try again.`).

Detalhes do fluxo de ataque: [ATTACKS-AND-RESULTS.md](ATTACKS-AND-RESULTS.md).

## Auditoria (`attack_acknowledgments`)

Em cada dispatch bem-sucedido (após criar o `AttackDispatch`), a API grava um registro de auditoria:

| Coluna | Conteúdo |
|--------|----------|
| `user_id` | Usuário autenticado |
| `project_id` / `system_id` | Escopo do disparo |
| `attack_dispatch_id` | Dispatch criado |
| `accepted_responsibility` / `accepted_legal_terms` | Sempre `true` após validação |
| `terms_version` | Versão aceita (`AttackAcknowledgmentTerms::VERSION`) |
| `ip_address` / `user_agent` | Contexto da requisição |
| `acknowledged_at` | Momento do aceite |

Não há CRUD público dessa tabela — apenas persistência no dispatch.

## O que foi removido

Endpoints e tabela de **assinaturas digitais** (token em meta tag HTML) foram removidos:

- ~~`POST .../signatures/generate`~~
- ~~`POST .../signatures/validate`~~
- ~~`POST .../signatures/revoke`~~
- Tabela `signatures` (drop)

O gating do dispatch deixa de depender de meta tag / token no alvo.
