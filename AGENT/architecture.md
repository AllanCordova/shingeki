# Architecture

Discuss architecture **before** designing a feature. Look up at the system shape, compare options, and only then plan implementation.

This guide is for architecture conversations between the user and the agent: trade-offs, migrations, and “what should we use?” — not for day-to-day coding details (see [`coding.md`](coding.md)).

## When to open this guide

- Starting a non-trivial feature that might change how data is fetched or composed.
- Someone suggests “let’s migrate X to Y”.
- A screen/API feels confusing (dual payloads, duplicated work, 1+N, unclear boundaries).
- Adding a new integration style (queue, cache, GraphQL field, BFF route, worker).

## Step 0 — Look up first

Before proposing code:

1. **Current architecture**: what already exists in this monorepo?
2. **Problem type**: CRUD, command/action, aggregation, preference/graph, report, realtime?
3. **Fit**: can the existing pattern solve it cleanly?
4. **Migration cost**: is a new approach worth the complexity?
5. **Decision**: keep / improve in place / migrate (with a narrow scope).

Do not invent a parallel stack when the repo already has a good answer.

## Current system shape

```text
Browser (Next UI)
  → same-origin BFF (`shingeki-client/app/api/*`)
    → Laravel (`shingeki-api`) with Sanctum Bearer
      → DB / queues / workers
```

| Layer | Role | Default tools |
|-------|------|----------------|
| UI | Screens and interaction | React, Next App Router |
| BFF | Cookie → Bearer, proxy | Next route handlers |
| API | Domain + persistence | Laravel, Eloquent, Services |
| Data read/write (most cases) | Resource APIs | **REST** + React Query |
| Graph composition (selected cases) | Typed query/mutation | **GraphQL** (Lighthouse + Apollo) |
| Auth | Session for SPA | http-only cookie + Sanctum token (server-side only) |

### What is already a good pattern here

- Thin controllers / GraphQL resolvers + services for business rules.
- Ownership checks on user-owned resources.
- Pest feature tests for important contracts.
- Parallel REST hooks on a page when resources are independent (project + systems + dashboard).

### What GraphQL is for here (today)

- Sidebar navigation: preferences (`items`) + visible tree (`tree`) + `meta` in one typed schema.
- Not a blanket replacement for REST.

## Problem → solution map

| Problem type | Prefer | Avoid |
|--------------|--------|--------|
| CRUD resource (project, system, catalog item) | REST resource + React Query | GraphQL “because we can” |
| Point action (dispatch attack, generate signature) | REST command endpoint | Over-modeling as a graph |
| Screen loads 2–3 independent resources | Parallel REST hooks | Forced single mega-endpoint |
| Confusing dual payload / same data built 2–3× / preference + tree | GraphQL **or** one clearer REST DTO — discuss first | Leaving the confusion in place |
| DB 1+N or duplicated queries inside one request | Fix the service (eager load, batch, `GROUP BY`) | Migrating protocol without fixing queries |
| Overlapping meta endpoints (e.g. unread count + list) | Improve REST (reuse counts) | GraphQL for a tiny win |
| Heavy report/export (PDF) | Keep dedicated REST/download | GraphQL binary hacks |
| Cross-cutting “user workspace” document (future) | Candidate for GraphQL — **discuss** | Migrating the whole API at once |

## When migration is a good idea

Migrate (or introduce a new style) when **most** of these are true:

1. The current shape is **structurally** confusing or expensive (not just a missing index).
2. The new approach matches an **existing** project direction (e.g. GraphQL already used for similar composition).
3. Scope can stay **narrow** (one domain), with a clear rollback/REST coexistence story.
4. Auth/BFF patterns stay intact (browser still never sees the token).
5. Tests can lock the new contract.

Delay migration when:

- A small service refactor removes 1+N or duplicated work.
- The endpoint is a simple CRUD/command.
- Migration would force rewriting unrelated screens.
- The only motivation is novelty.

## How we discuss architecture (user + agent)

In an architecture thread, the agent should:

1. Restate the problem in one sentence.
2. Describe the **current** flow (who calls what).
3. List **2–3** realistic options (including “keep REST and fix the service”).
4. Recommend one option with trade-offs (complexity, performance, consistency, risk).
5. Only then sketch a plan / files — via [`workflow.md`](workflow.md).

Do not jump straight to implementation during an architecture discussion unless the user asks to proceed.

### Useful questions

- Is this a boundary problem (wrong API shape) or an implementation bug (bad query)?
- Does the UI need field selection / multiple shapes from one domain?
- Will other clients (mobile, workers) need the same contract?
- What breaks if we keep REST for six more months?

## REST vs GraphQL (project rule)

- **Default: REST.**
- **GraphQL:** graph/preference composition, opaque multi-shape payloads, or clear field-selection needs — after an architecture check.
- Coexistence is normal: sidebar GraphQL + everything else REST is intentional, not incomplete.

## Anti-patterns

- “Rewrite everything in GraphQL.”
- New architecture per feature with no link to the repo.
- Protocol migration that leaves 1+N untouched.
- Bypassing the BFF and putting tokens in the browser.
- Mega-endpoints that mix unrelated domains “for convenience.”

## Related guides

- After a decision: [`workflow.md`](workflow.md) (plan → build → review → git).
- While coding: [`coding.md`](coding.md).
- Before merge: [`code-review.md`](code-review.md).
