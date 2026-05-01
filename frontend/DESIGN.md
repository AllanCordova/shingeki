# Design & development contract

**This file is binding context for anyone building the frontend (including AI assistants).** Treat every rule below as a requirement, not a suggestion. If something is unclear, align with these principles before shipping UI or structure changes.

---

## Why this matters

Consistency, accessibility, and maintainability depend on shared tokens and patterns. Deviating without updating this document and the token layer (`app/globals.css`) creates drift and fragile UX.

---

## Visual system

- **Tokens first:** Use CSS variables defined in `app/globals.css` (surfaced through Tailwind theme tokens such as `bg-background`, `text-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, etc.). Do not introduce one-off hex colors for surfaces or typography unless there is no token and you extend the theme deliberately.
- **Primary brand:** Violet is the system primary (`primary`, `primary-hover`, `primary-muted`, `primary-foreground`, `ring`). Use it for main actions, key highlights, and focus states—not for large body text blocks.
- **Typography:** The app uses **Plus Jakarta Sans** via `next/font`. Scale titles, subtitles, and body with existing fluid sizes (`text-title`, `text-subtitle`, `text-body` where configured) or Tailwind utilities that respect the same hierarchy.
- **Layout:** Responsive by default; verify layouts at common breakpoints and avoid fixed widths that break small screens.
- **Styling surface:** Prefer **Tailwind** utilities. Avoid bespoke CSS files or inline styles unless Tailwind cannot express the need cleanly (then keep scope minimal and document in code if non-obvious).
- **Motion:** Use transitions and animations sparingly; prefer short, purposeful motion that does not hurt performance or distract from tasks.
- **Accessibility:** Meet contrast expectations for text and interactive states, use semantic HTML, support keyboard navigation, and use ARIA only where semantics are insufficient.
- **Cohesion:** Pages and components should feel like one product—same spacing rhythm, radius scale, and color roles.

---

## Engineering practices

- **Reuse:** Prefer shared components over copy-paste. Extract when the same UI or behavior appears more than once.
- **Semantics & SEO:** Use meaningful HTML (`main`, `nav`, `button`, headings in order, etc.). Set appropriate metadata for pages (titles, descriptions, social previews).
- **Next.js conventions:** Use `next/image` for images (sizing, formats, performance). Use `next/link` for internal navigation.
- **Structure:** Keep reusable UI under `components/` with subfolders as needed (`components/ui`, `components/layout`, etc.). Follow the App Router layout the project uses (`app/` routes, not legacy `pages/` unless the repo explicitly uses it).
- **Modularity:** Separate concerns across files and folders so features can grow without tangled imports.
- **Code quality:** Clear names for variables and functions; avoid noise comments; keep diffs focused.
- **Quality gates:** Run and extend tests as the stack allows; do not regress behavior without fixing or updating tests.
- **Language:** User-facing copy, variable names, and function names in **English** unless the product explicitly targets another locale.

---

## Checklist before merging UI work

1. Uses theme tokens (including violet primary where appropriate).
2. No avoidable custom CSS; Tailwind-first.
3. Responsive and keyboard-friendly.
4. Copy and identifiers in English (per project rule).

When you change global tokens or typography, update this file only if the **contract** itself changes (new token category, new mandatory pattern—not every small tweak).
