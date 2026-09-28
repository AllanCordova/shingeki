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
      "kind": "framework",
      "languages": ["php"]
    }
  ]
}
```

| Campo | Descrição |
|-------|-----------|
| `slug` | Identificador estável (`laravel`, `vanilla_php`, `generic`, …) |
| `name` | Nome exibido no client |
| `kind` | `language`, `framework` ou `generic` |
| `languages` | Idiomas suportados pela stack (usado no fallback SAST da remediação). Vazio na stack genérica, que vale para qualquer arquivo |

## Associação ao sistema

Um sistema pode ter **várias** stacks via pivot `system_stack`:

| Coluna | Descrição |
|--------|-----------|
| `system_id`, `stack_id` | Relação N:N |
| `is_primary` | Flag opcional (pivot) |

Na API:

- **Create:** `stack_ids` opcional (array de UUIDs; pode ser omitido ou vazio)
- **Update:** `stack_ids` opcional (substitui a lista com `sync()`, inclusive lista vazia)
- **Resposta:** cada sistema inclui `stacks[]` com `id`, `slug`, `name`, `kind`, `languages`, `is_primary`

Em `multipart/form-data`, envie `stack_ids[]` repetido por UUID. Para limpar a seleção, envie `stack_ids` vazio.

A stack `generic` não entra no formulário do sistema. Ela guarda as remediações curingas usadas quando o sistema não tem stack, ou quando a stack escolhida não tem snippet para aquela vulnerabilidade.

## Modelo `stacks`

| Coluna | Exemplo |
|--------|---------|
| `slug` | `laravel`, `vanilla_php`, `express`, `generic` |
| `name` | Laravel, PHP, Genérica |
| `kind` | `language`, `framework`, `generic` |
| `languages` | `["php"]`, `["typescript", "javascript"]`, `[]` |

## Seed inicial

`StackCatalogSeeder` é a fonte da lista. Além de `generic`, o catálogo cobre linguagens web (PHP, JavaScript, TypeScript, Python, Ruby, Java, C#, Go, Kotlin, Elixir) e frameworks (Laravel, Symfony, CodeIgniter, CakePHP, WordPress, Livewire, Express, NestJS, Fastify, Hono, React, Next.js, Angular, Vue, Nuxt, Svelte, SvelteKit, Remix, Astro, htmx, Django, Flask, FastAPI, Ruby on Rails, Spring Boot, Ktor, ASP.NET, Blazor, Gin, Phoenix).

O seed associa stacks aos sistemas demo (`DemoProjectsSeeder`). O treino DAST não usa alvos Docker; o gabarito é [goldset](../architecture/shingeki-dast-goldset.md).

## Uso na remediação

O endpoint `POST .../remediate` não exige stack. Sem stacks, o `RemediationResolver` usa a stack `generic`. Com stacks, busca o snippet da stack escolhida e, se não houver match, cai na remediação genérica da mesma categoria.

Detalhes do fluxo e do lookup: [REMEDIATION.md](REMEDIATION.md).
