# Workflow

Standard flow for delivering a feature (or non-trivial change) in this repository.

## Overview

```text
0. Architecture check (when the shape of the solution is unclear)
1. Describe the feature
2. Plan (detailed plan)
3. Implement
4. Code review ([`code-review.md`](code-review.md)), including comments, tests, security, and **product copy** ([`copy.md`](copy.md))
5. Git + PR ([`git.md`](git.md))
```

Do not skip steps for changes that touch the API, auth, user data, or more than one package (`apps/api` / `apps/client`).

## 0. Architecture check

If the change might need a new integration style, a migration, or a different data-composition approach, start with [`architecture.md`](architecture.md).

Agree on **keep / improve in place / migrate** before writing a detailed implementation plan.

## 1. Describe the feature

Before coding, make explicit:

- **Problem**: what is wrong or missing today.
- **Expected outcome**: what the user/system can do afterward.
- **Scope**: what is in and what is out.
- **Surface**: API, client, both, workers, docs.
- **Risks**: auth, data, performance, breaking changes.

If the request is ambiguous, ask **1–2** critical questions before planning. Do not invent requirements.

## 2. Plan

Produce a detailed, actionable plan:

- Files/layers involved.
- Chosen approach (and why not the obvious alternative, when there is a real trade-off).
- REST vs GraphQL per [`architecture.md`](architecture.md), [`code-review.md`](code-review.md), and [`coding.md`](coding.md).
- Tests to add or update.
- Execution order (backend before client when the contract is new).

Start implementing only after the plan is clear (and approved by the user when they asked for a plan).

## 3. Implement

- Follow [`coding.md`](coding.md).
- Focused changes: no unsolicited side refactors.
- Keep the project runnable: BFF, auth, and contracts stay coherent.
- Prefer existing repo patterns; if you introduce a new pattern, keep it consistent and minimal.

## 4. Code review

When implementation is done (or on an explicit review request):

1. Apply the checklist in [`code-review.md`](code-review.md).
2. Fix blocking findings in the same cycle.
3. Run affected tests and report results.
4. Deliver a short verdict (ok / ok with fixes / block).

## 5. Finish with Git + PR

Only when the user asks for commit/PR, or when the workflow explicitly reaches this step:

- Follow [`git.md`](git.md) from start to finish.
- Do not commit or open a PR on your own outside that request/step.

## Allowed shortcuts

| Situation | Flow |
|-----------|------|
| Typo / comment / obvious one-file fix | Implement → quick review → git if asked |
| Clear bug with known cause | Describe in 2 lines → implement → review → git if asked |
| Feature / migration / contract change | Full flow (0→5 as needed) |

## Anti-patterns

- Coding a wide change without a plan.
- Opening a PR without review and without tests for the touched area.
- Mixing unrelated features in one PR.
- Expanding scope with “while we are here”.
