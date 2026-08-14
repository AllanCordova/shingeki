# Code review

Required checklist when reviewing code in this repository (new features, refactors, PRs, or “review what we just did”).

## Goal

Ensure the code is correct, readable, secure, aligned with project patterns (or establishes a good new pattern), and acceptably fast — without noise.

## Checklist

### 1. Comments

- Remove comments that only narrate what the code already says.
- Keep documentation only: why a decision exists, public contracts, security constraints, usage limits.
- PHPDoc/`@param`/`@return` on PHP APIs when types alone are not enough.
- No `eslint-disable` without a short, necessary justification.

### 2. Tests

- Run affected tests (Pest in `shingeki-api`, lint/typecheck in `shingeki-client` when relevant).
- Cover the happy path and authorization/ownership when the change touches user data.
- Do not call it done if the feature test fails or was removed without a replacement.

### 3. Clarity and patterns

- Easy to understand in one pass: honest names, single-purpose functions, files in the right place.
- Follow existing project patterns (hooks in `lib/hooks`, BFF in `app/api`, services in `app/Services`, contracts in `lib/contracts`).
- If establishing a new pattern (e.g. GraphQL for a domain), document why in the PR/summary and keep the next similar features consistent.
- Avoid premature abstractions and confusing duality (two payloads for the same thing without need).

### 4. Security

- Authenticated endpoints require real auth (`auth:sanctum` / `@guard`).
- Always validate ownership (users only access/change their own resources).
- Browser must not receive the Sanctum token; flow via BFF + http-only cookie.
- Validate inputs (Form Request / GraphQL input rules); do not trust the client.
- No secrets in code, logs, or commits.

### 5. Performance

- Avoid DB 1+N (eager load, batch upsert/`whereIn`, `GROUP BY` for counts).
- Avoid duplicated work in the same request (do not run the same builder 2–3 times).
- On the client: stable references (`useMemo` / empty constants) to avoid render loops.
- Cache only when safe (e.g. do not serialize GraphQL AST with `CACHE_STORE=database`).

### 6. REST vs GraphQL

- **REST**: CRUD, point actions, clear resource boundaries, no 1+N.
- **GraphQL**: graph composition, preferences + tree, field selection that removes a confusing payload.
- Do not migrate to GraphQL for fashion; only when REST is structurally opaque or inefficient.
- For migration debates, use [`architecture.md`](architecture.md) first.

### 7. Product copy

- Review user-facing strings with [`copy.md`](copy.md).
- UI, toasts, empty states, and API messages shown to users must read as a **product**, not as notes between developers.
- Reject copy that mentions pilot/MVP/lab shortcuts, unfinished Chrome Web Store plans, raw package filenames as primary labels, or customer-specific names when the feature is generic.
- Keep distribution and lab details in `docs/` / READMEs, not in the logged-in product UI.

## How to report the review

Short summary for the author:

1. **Verdict**: ok / ok with fixes / block.
2. **Findings**: objective list (file + problem + suggested fix).
3. **Tests**: what ran and the result.
4. **Residual risk**: what was intentionally left out of scope.

## Example of a good pattern (sidebar GraphQL)

- Typed schema (`items` + `tree` + `meta`) instead of a REST controller building the same data three times.
- Single service (`forUser` / `syncForUser` with batch upsert).
- Apollo on the client only for that domain; REST + React Query elsewhere.
- BFF `/api/graphql` preserving the project auth model.
