# Coding

How to write code in this repository: project patterns first, design principles in practice, no over-engineering.

## Golden rules

1. **Match the surrounding code** (structure, names, folders, libraries).
2. Apply **SOLID and clarity** at a practical midpoint — idiomatic, not confusing, not bloated.
3. Prefer the **simple, readable** solution the team already recognizes.

The repo is already in good shape. Do not reinvent architecture on every feature.

## Monorepo map

| Area | Role |
|------|------|
| `shingeki-api` | Laravel API (REST + Lighthouse GraphQL) |
| `shingeki-client` | Next.js BFF + UI (React Query + Apollo where needed) |
| Workers / other packages | Follow each package’s local pattern |

### Client (`shingeki-client`)

- Data hooks in `lib/hooks`.
- Shared contracts/types in `lib/contracts`.
- BFF in `app/api/*` via `forwardToApi` / `forwardToGraphql` (token only on the server).
- UI in `components/*`; thin pages in `app/`.
- REST + React Query by default; Apollo only where GraphQL is already adopted (e.g. sidebar).

### API (`shingeki-api`)

- Thin controllers; business rules in `app/Services`.
- Lean Eloquent models; ownership in queries/policies.
- GraphQL: schema in `graphql/`, resolvers in `app/GraphQL`, reused services.
- Pest feature tests for important contracts.

## SOLID in practice (midpoint)

Apply the spirit of SOLID without exploding the number of files.

| Principle | Practice here |
|-----------|----------------|
| **S**ingle responsibility | A class/module has one clear reason to change. Controllers do not own heavy rules; services do not render HTTP. |
| **O**pen/closed | Prefer extending via new methods/services/schema fields over patching giant conditionals. |
| **L**iskov | Do not force hierarchies; prefer composition. |
| **I**nterface segregation | Small hook/service APIs. Do not return a god object when the caller needs two fields. |
| **D**ependency inversion | Inject services in Laravel; in the client, depend on hooks/contracts, not axios/Apollo details spread through UI. |

### Midpoint (important)

- **Do not** create one class per method “for SOLID”.
- **Do not** keep 1k+ line god-files with mixed responsibilities.
- Extract when: the file is hard to navigate, there is clear 1+N/duplication, or two distinct domains share one place.
- Keep together when: it is a short cohesive flow (e.g. one sidebar service with `forUser` + `syncForUser`).

## Idiomatic and clear

- Honest names (`forUser`, `syncForUser`, `useSidebarNavigation`).
- One abstraction at a time; avoid dual shapes for the same thing without need.
- Stack-typical solutions: Eloquent + Service, React hooks, Next BFF.
- Comments for documentation only (see [`code-review.md`](code-review.md)).
- No unused enums/configs/factories.

## File size and modularization

- Prefer files that fit in one reading (~200–400 lines as a warning signal, not a hard law).
- Split by responsibility: schema / resolver / service / hook / UI.
- UI: focused components; data logic in the hook.
- If a settings component grows too much, extract pure helpers (group/sort) before inventing a framework.

## Performance and data

- Avoid 1+N: `with()`, `whereIn`, batch upsert, `GROUP BY`.
- Do not recompute the same aggregate 2–3 times in one request.
- In React: stable references when lists feed `useEffect`.
- Choose REST vs GraphQL using [`architecture.md`](architecture.md) and [`code-review.md`](code-review.md).

## Security (always)

- Auth on routes/fields (`auth:sanctum`, `@guard`).
- Ownership on every sensitive read/write.
- Validate input; never trust the client.
- Token only in the BFF (http-only cookie).

## Quick checklist before merging code

- [ ] Does it look like neighboring code?
- [ ] Can you explain the solution in 2–3 sentences?
- [ ] Is any class/file doing too many things?
- [ ] Any obvious 1+N or duplicated fetch?
- [ ] Auth/ownership/validation OK?
- [ ] Area tests updated and passing?
