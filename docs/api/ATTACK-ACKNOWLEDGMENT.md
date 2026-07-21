# API — Aceite de responsabilidade (dispatch)

Antes de enfileirar ataques DAST/SAST, o usuário deve declarar responsabilidade e aceitar os termos legais. O client mostra o formulário de aceite **uma vez por sistema** enquanto a `terms_version` atual estiver válida; se a versão mudar, o aceite é pedido de novo. Voltar ao [índice da API](../API.md).

Constantes em `App\Support\AttackAcknowledgmentTerms`:

| Constante | Valor |
|-----------|--------|
| `RESPONSIBILITY_CODE` | `SHINGEKI-ATTACK-ACK-1` |
| `VERSION` (`terms_version`) | `2026-07-13` |

Texto completo (UI): `/termos/ataques` no client.

## GET status do aceite

`GET /api/projects/{project}/systems/{system}/attack-acknowledgment`

**Resposta `200`:**

```json
{
  "acknowledged": true,
  "acknowledged_at": "2026-07-17T12:00:00.000000Z",
  "terms": {
    "title": "Código de conduta para disparo de ataques",
    "version": "2026-07-13",
    "responsibility_code": "SHINGEKI-ATTACK-ACK-1",
    "paragraphs": ["..."],
    "checklist": ["...", "..."]
  }
}
```

`acknowledged` é `true` quando existe registro do usuário para aquele sistema com a `VERSION` atual e ambos os aceites.

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

Mesmo com aceite prévio na UI, o body do dispatch continua enviando os flags (auditoria por disparo).

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

Não há CRUD público dessa tabela — apenas persistência no dispatch e consulta de status.

## O que foi removido

Endpoints e tabela de **assinaturas digitais** (token em meta tag HTML) foram removidos:

- ~~`POST .../signatures/generate`~~
- ~~`POST .../signatures/validate`~~
- ~~`POST .../signatures/revoke`~~
- Tabela `signatures` (drop)

O gating do dispatch deixa de depender de meta tag / token no alvo.
