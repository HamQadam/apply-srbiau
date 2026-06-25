---
target: frontend/src/pages
total_score: 21
p0_count: 1
p1_count: 3
timestamp: 2026-06-25T20-44-16Z
slug: frontend-src-pages
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading skeletons solid; no progress indicator during multi-step onboarding; page-level loading is all-or-nothing |
| 2 | Match System / Real World | 3 | Good i18n; ExperienceBrowsePage has raw English hardcoded outside i18n; status labels use raw enum strings |
| 3 | User Control and Freedom | 2 | No undo for deletion beyond confirm; Explore hard-navigates to dashboard after add; Onboarding has no back button |
| 4 | Consistency and Standards | 2 | rounded-2xl on stat cards vs rounded-xl on buttons vs rounded-lg on inputs — no radius system; shadow-sm at rest on all cards violates Flat-At-Rest rule |
| 5 | Error Prevention | 2 | Delete confirm is good; Explore hard-redirects on success; login shows double feedback (inline + toast); no pre-submit validation |
| 6 | Recognition Rather Than Recall | 3 | Filter state preserved in URL; active chips shown; nav labels clear |
| 7 | Flexibility and Efficiency | 1 | No keyboard shortcuts; no bulk actions; no quick-add; Explore requires full context switch to track |
| 8 | Aesthetic and Minimalist Design | 2 | Gradient backgrounds on nearly every surface; ghost-card pattern on all stat cards |
| 9 | Error Recovery | 2 | Errors shown as toast AND inline simultaneously on Login; toasts disappear before user can act; no retry offered |
| 10 | Help and Documentation | 1 | No contextual help; Quick Tips is static decoration; no tooltips on complex fields; empty states don't explain scoring |
| **Total** | | **21/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment**: Three fingerprints of AI generation visible. (1) Gradient-as-decoration reflex: bg-gradient-to-r from-brand-secondary to-brand-primary appears on Dashboard button, empty-state CTA, profile card icon, balance card bg, quick tips bg, Recommendations page bg, every recommendation card score header, and the homepage hero. When everything is a gradient, the gradient signals nothing. (2) rounded-2xl proliferation: stat cards, empty-state containers, and sidebar widgets use 24px corners against a DESIGN.md cap of 12–16px. (3) Ghost-card anti-pattern: all 5 stat cards and every sidebar panel pair border border-border with shadow-sm at rest.

**Deterministic scan**: 2 findings — both confirmed real, no false positives.
- RecommendationsPage.tsx:115 — gradient text on h1 (bg-clip-text + bg-gradient). Hard ban. Heading invisible in headless/print contexts.
- RecommendationsPage.tsx:134 — same pattern on Wizard h1.

## Overall Impression

Solid foundation: good i18n, Framer Motion used correctly on interactions, filter-in-URL pattern is professional, ConfirmDialog before destructive actions is well-placed, skeleton loading is consistently applied. The design layer needs work. The gradient reflex has colonised nearly every surface. Persian Teal (#0d7377 from DESIGN.md) exists in the token definition but CSS still uses old cobalt blue (#2563EB) throughout — the visual identity from init is inert in the actual product.

## What's Working

1. **Skeleton loading states.** Every async surface has a skeleton layout. Production-quality feedback handling.
2. **Filter state in URL.** Explore's filters live in URLSearchParams — shareable, bookmarkable, back-navigable.
3. **ConfirmDialog before destructive action.** The delete flow is correct and non-blocking.

## Priority Issues

**[P0] Gradient text on Recommendations heading — invisible in some renderers**
- RecommendationsPage.tsx lines 115 and 134: bg-clip-text + text-transparent on h1. Heading has zero foreground color. Invisible in headless browsers, print, and some a11y tools.
- Fix: Replace with text-text-primary. Emphasis via font-weight 700 is sufficient.
- Suggested command: $impeccable colorize frontend/src/pages/Recommendations

**[P1] Ghost-card anti-pattern on all stat cards and sidebar panels**
- Dashboard stat cards, Deadlines panel, Quick Tips panel, Ghadam Balance panel: all use border border-border + shadow-sm at rest simultaneously.
- Fix: Remove shadow-sm from all resting card states. Add hover shadow only on interactive cards.
- Suggested command: $impeccable polish frontend/src/pages/Dashboard

**[P1] Gradient decoration on every surface — primary AI tell**
- bg-gradient appears on 10+ surfaces across the product. Removes all signal value from the gradient.
- Fix: Remove gradient backgrounds from Recommendations page bg, Dashboard sidebar widget bgs, recommendation card score headers (use solid semantic color by score tier). Keep one: the HomePage hero.
- Suggested command: $impeccable colorize frontend/src

**[P1] Brand color tokens in CSS don't match DESIGN.md — Persian Teal never renders**
- index.css still defines --brand-primary: 37 99 235 (cobalt #2563EB). DESIGN.md defines Persian Teal (#0d7377). Every text-brand-primary renders cobalt, not teal.
- Fix: Update --brand-primary to 13 115 119 in index.css.
- Suggested command: $impeccable colorize frontend/src

**[P2] rounded-2xl (24px) as default card radius — violates DESIGN.md 12–16px cap**
- Dashboard stat cards, empty-state container, sidebar panels, Recommendations cards, Experiences cards all use rounded-2xl.
- Fix: Change all card rounded-2xl to rounded-xl (16px max). Stat cards: rounded-lg (8px).
- Suggested command: $impeccable polish frontend/src

## Persona Red Flags

**Jordan (Confused First-Timer)**: No confirmation/summary moment after onboarding wizard completion. Explore has 7 simultaneous filters violating the ≤4 working memory rule. Filter labels at 12px muted gray are at ~4.4:1 contrast — below required 4.5:1. After adding a program, hard-navigation to /dashboard prevents adding multiple programs in one session.

**Sam (Accessibility-Dependent)**: MultiSelectCombobox has no ARIA role="combobox", aria-expanded, or aria-activedescendant. Navbar active state communicated by color only — no aria-current="page". Emoji icons throughout have no aria-label. Framer Motion whileHover effects have no keyboard equivalent.

**Farida (Anxious Deadline Tracker)**: Stat card "Upcoming Deadlines" count is disconnected from the deadline list — no link between them. Mobile stat card row has no scroll affordance. Quick Tips are static and become noise after repeat visits. Decorative gradient on functional progress bar adds visual noise at an anxiety-critical moment.

## Minor Observations

- ExperienceBrowsePage is entirely un-i18n'd — all strings hardcoded English. Broken for FA users.
- hover:bg-brand-secondary as primary button hover shifts hue entirely (cobalt → indigo), not lightness.
- PageTransition uses y:16 slide which is a product-register violation (no orchestrated page-load sequences).
- Recommendations page min-h-screen gradient background conflicts with Navbar bg at scroll boundary.
- Emoji used as primary UI icons throughout — platform-inconsistent rendering, uncontrollable sizing.
- getScoreColor returns partial Tailwind class names in template literals — latent CSS purge bug in production builds.
- No @media print stylesheet; window.print() will print app chrome and gradient backgrounds.

## Questions to Consider

- "The gradient-as-default pattern appears on 10+ surfaces. If the gradient were removed everywhere except the HomePage hero, what would you use instead to signal brand energy?"
- "The Experiences page is the least designed page in the product and the only one not i18n'd. Should it feel different from the tracker and explorer — warmer, more editorial — or consistent with them?"
- "Every empty state uses a large emoji icon. Is that the right energy for a product dealing with high-stakes academic decisions?"
