# AGENT

Permanent instructions for agents (Cursor and similar) working in this repository.

## How to use

1. Read this file at the start of non-trivial tasks.
2. Consult [`AGENT/`](AGENT/) for specific guides.
3. Prefer the more specific guide when guides conflict.
4. For architecture decisions or migrations: start with [`AGENT/architecture.md`](AGENT/architecture.md).
5. For features: follow [`AGENT/workflow.md`](AGENT/workflow.md) end to end.

## Available guides

| File | When to use |
|------|-------------|
| [`AGENT/architecture.md`](AGENT/architecture.md) | Look up before a feature: current architecture, when to migrate, which solutions fit |
| [`AGENT/workflow.md`](AGENT/workflow.md) | Feature flow: describe → plan → implement → review → git/PR |
| [`AGENT/coding.md`](AGENT/coding.md) | How to code: repo patterns, practical SOLID, modularization |
| [`AGENT/code-review.md`](AGENT/code-review.md) | Code review, PRs, refactors, post-implementation validation |
| [`AGENT/copy.md`](AGENT/copy.md) | User-facing copy: product voice, no internal leakage |
| [`AGENT/git.md`](AGENT/git.md) | Sync with `develop`, branch, commit, and PR via `gh` (always English) |

## Project principles

- Focused changes: do not expand scope beyond the request.
- REST remains the default for CRUD and point actions.
- GraphQL (Lighthouse + Apollo) only for graph/preference composition (e.g. sidebar).
- Auth: browser never sees the token; Next BFF forwards the http-only cookie as Bearer.
- Comments: documentation only; do not narrate the obvious.
- Copy: UI and user-visible messages follow [`AGENT/copy.md`](AGENT/copy.md) (product voice; no internal jargon).
- Tests: validate what changed before calling it done.
- Git: base `develop`; branch names, commits, and PRs in English.
- Commits: author is the configured git user (never Cursor); never add `Co-authored-by: Cursor`.
