# API — Stacks tecnológicas

Catálogo de frameworks e linguagens associados a cada sistema. Usado principalmente na [remediação](REMEDIATION.md) para sugerir snippets adequados à stack. Voltar ao [índice da API](../API.md).

CRUD de sistemas (`stack_ids`): [PROJECTS-AND-SYSTEMS.md](PROJECTS-AND-SYSTEMS.md).

## GET /api/stacks

Lista stacks disponíveis para o formulário do sistema (requer `auth:sanctum`).

**Resposta `200`:**

```json
{
  "stacks": [
    {
      "id": "uuid",
      "slug": "laravel",
      "name": "Laravel",
      "languages": ["php"]
    }
  ]
}
```

| Campo | Descrição |
|-------|-----------|
| `slug` | Identificador estável (`laravel`, `vanilla_php`, …) |
| `name` | Nome exibido no client |
| `languages` | Idiomas suportados pela stack (usado no fallback SAST da remediação) |

## Associação ao sistema

Um sistema pode ter **várias** stacks via pivot `system_stack`:

| Coluna | Descrição |
|--------|-----------|
| `system_id`, `stack_id` | Relação N:N |
| `is_primary` | Flag opcional (pivot) |

Na API:

- **Create:** `stack_ids` obrigatório (array de UUIDs, mínimo 1)
- **Update:** `stack_ids` opcional (substitui a lista com `sync()`)
- **Resposta:** cada sistema inclui `stacks[]` com `id`, `slug`, `name`, `languages`

Em `multipart/form-data`, envie `stack_ids[]` repetido por UUID.

## Modelo `stacks`

| Coluna | Exemplo |
|--------|---------|
| `slug` | `laravel`, `vanilla_php`, `express` |
| `name` | Laravel, PHP |
| `languages` | `["php"]`, `["typescript", "javascript"]` |

## Seed inicial

`StackCatalogSeeder` cria:

| `slug` | Nome | `languages` |
|--------|------|---------------|
| `laravel` | Laravel | `php` |
| `vanilla_php` | PHP | `php` |
| `express` | Express | `javascript` |
| `react` | React | `typescript`, `javascript` |
| `angular` | Angular | `typescript`, `javascript` |
| `nextjs` | Next.js | `typescript`, `javascript` |

O alvo de laboratório (**Vulnerable PHP Target**) é associado somente à stack `vanilla_php` pelo `VulnerableTargetSeeder`. O alvo de treino (**OWASP Juice Shop**) usa `express` + `angular` (`JuiceShopSeeder`) — [shingeki-juice-shop.md](../architecture/shingeki-juice-shop.md).

## Uso na remediação

O endpoint `POST .../remediate` exige pelo menos uma stack no sistema. Para cada achado, o `RemediationResolver` busca snippets no catálogo `remediations` filtrando por `stack_id` das stacks do sistema.

Detalhes do fluxo e do lookup: [REMEDIATION.md](REMEDIATION.md).
