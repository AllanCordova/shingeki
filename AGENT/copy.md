# Product copy

Rules for user-facing text in the Shingeki product (UI, emails, in-app help, client-facing status messages). Audience is **customers and operators**, not the two developers who built the feature.

## Where this applies

- `shingeki-client` UI (pages, panels, modals, toasts, empty states, helper text)
- User-visible errors returned to the browser (API messages that surface in the client)
- Onboarding / guided setup copy

Does **not** replace engineering docs in `docs/` or package READMEs aimed at contributors — those may mention lab, Docker, Web Store publishing, and internal setup.

## Principles

1. **Product voice**: clear, calm, helpful. Explain what the user should do next.
2. **No internal process leakage**: do not mention pilot, MVP, WIP, “for us”, lab-only shortcuts as if they were the product story, unfinished store listing plans, or “in production the ideal path is…”.
3. **No implementation dump**: avoid names like “Rod”, queue names, “prefetch”, Git branches, Dockerfile, or raw file package names unless the user must use them (e.g. a documented install step).
4. **No customer names as the only example** when the feature is generic (“Bling and other SaaS” → “external authenticated systems”).
5. **Secrets never in copy**: no tokens, cookies, sample JWT fragments, or “paste your production cookie here” without a strong auth warning and scoped UI.
6. **Consistent terms**: prefer the product glossary already used in the UI (alvo, sessao, disparo, profundidade, remediacao).

## Good vs bad

| Avoid (internal) | Prefer (product) |
|------------------|------------------|
| Em producao o caminho ideal e a Chrome Web Store; o ZIP e so piloto | Instrucoes de instalacao da extensao + o que fazer depois |
| Lab vulneravel / alvo de teste interno | Alvos cooperativos (quando houver captura via popup) |
| Para Bling e outros SaaS | Para sistemas externos autenticados |
| Baixar `shingeki-target-session.zip` as the label | Baixar a extensao Shingeki (URL can still point to the zip) |
| Worker ignorou start_path / rebuild a imagem | Ops/alerts stay in logs and engineering docs |

## Checklist (agents and human review)

Before shipping UI or user-visible API messages:

- [ ] Would this sentence make sense to a customer who never saw the repo?
- [ ] Does it expose unfinished distribution plans, lab-only paths, or developer gossip?
- [ ] Does it tell the user the next useful action?
- [ ] Error text is actionable and does not leak stack traces or secrets?
- [ ] PT copy matches the tone of neighboring screens (and does not mix casual Discord talk with formal policy language without reason)?

When in doubt, rewrite for the customer and keep the engineering detail in `docs/` or `AGENT/`.
