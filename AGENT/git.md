# Git

Rules for branches, commits, and pull requests. Names, messages, and PR descriptions are **always in English**.

Remote integration base: **`develop`** (project development branch).

## Required order

1. Sync with `origin/develop`
2. Create a separate branch
3. `git add` + commit (short descriptive English message)
4. Push + open PR with `gh` (English description)

Do not skip the sync. Do not commit directly to `main` / `develop`.

## 1. Sync with develop

Before any new feature branch or feature commit:

```bash
git fetch origin
git checkout develop
git pull origin develop
```

If already on a work branch and it needs updating:

```bash
git fetch origin
git merge origin/develop
```

(Prefer a plain merge; rebase only if the user explicitly asks.)

Resolve conflicts before continuing. Do not `--force` on `develop` / `main`.

## 2. Branch

Create the branch from an up-to-date `develop`:

```bash
git checkout -b feat/short-topic-name
```

Naming conventions (English, kebab-case):

| Prefix | Use |
|--------|-----|
| `feat/` | New capability |
| `fix/` | Bug fix |
| `chore/` | Tooling, deps, cleanup |
| `docs/` | Documentation |
| `refactor/` | Refactor with no behavior change |

Good examples: `feat/sidebar-graphql`, `fix/lighthouse-query-cache`, `docs/agent-workflow`.

## 3. Commit

Only after the user asks for a commit (or when finishing the Git step of the workflow).

```bash
git status
git diff
git log -5 --oneline
```

Stage only files that belong to the change. Do not add secrets (`.env`, credentials, tokens).

### Authorship (required)

- Author and committer must be the **repo owner** from local git config (e.g. `AllanCordova` / their email). Never override with a Cursor/agent identity.
- **Never** add `Co-authored-by: Cursor <cursoragent@cursor.com>` (or any Cursor/agent co-author trailer).
- Do not add other `Co-authored-by` lines unless the user explicitly asks.
- After committing, verify with `git log -1 --format=full`. If a Cursor co-author trailer was injected, remove it with amend **before push** when the amend safety rules allow; if already pushed, ask the user before force-pushing.

Message: **short, descriptive, English**, matching repo style:

```text
feat(client): migrate sidebar navigation to GraphQL
fix(api): avoid incomplete class in Lighthouse query cache
docs: add agent workflow and git guides
```

Preferred format: `type(scope): summary` (imperative, no trailing period).

Example commit:

```bash
git add AGENT.md AGENT/workflow.md AGENT/git.md AGENT/coding.md
git commit -m "$(cat <<'EOF'
docs: add agent workflow, git, and coding guides

EOF
)"
git status
```

On PowerShell/Windows, if heredoc is unavailable:

```bash
git commit -m "docs: add agent workflow, git, and coding guides"
```

Do not use `--no-verify` / `--amend` / force push unless the user explicitly asks and agent safety rules allow it.

## 4. Pull request with gh

```bash
git push -u origin HEAD
gh pr create --base develop --title "feat: short title in English" --body "$(cat <<'EOF'
## Summary
- Bullet of what changed and why

## Test plan
- [ ] Relevant tests / manual checks

EOF
)"
```

PR rules:

- **Base**: `develop` (not `main`, unless a release was requested).
- **Title** and **body** in English.
- Summary focused on *why* + impact.
- Test plan with a practical checklist.
- Return the PR URL to the user.

If the branch already tracks a remote and no PR exists yet, only run `gh pr create`. If a PR already exists, do not open a duplicate — share the URL via `gh pr view --web` or `gh pr view --json url`.

## Anti-patterns

- Committing directly to `develop` / `main`.
- Branch or commit messages in another language.
- Huge PRs with unrelated features.
- Force-pushing a shared branch without an explicit request.
- Forgetting `fetch`/`pull` of `develop` before branching.
- Adding `Co-authored-by: Cursor <cursoragent@cursor.com>` (or any agent co-author).
- Committing as Cursor/agent instead of the configured user (`user.name` / `user.email`).
