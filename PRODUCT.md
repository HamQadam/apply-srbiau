# Product

## Register

product

## Users

Iranian bachelor and master's students planning to study abroad — primarily targeting master's and PhD applicants. They arrive in different states: anxious and overwhelmed by deadlines, methodically comparing programs, or just beginning to explore what's possible. Many are navigating a high-stakes decision with incomplete information, often relying on Telegram groups and word of mouth. The product must serve all three moods: the stressed tracker, the analytical researcher, and the curious first-timer. The interface is Persian-first; RTL and bilingual (FA/EN) are first-class requirements, not afterthoughts.

## Product Purpose

Ghadam is a Persian-first academic immigration planning platform. It helps Iranian applicants discover university programs (Germany, Netherlands, and expanding), compare deadlines and requirements, track their own applications, receive explainable program recommendations, and learn from other applicants' shared experiences. The product sits at the intersection of structured data (program requirements, deadlines, rankings) and human insight (community experiences, personal planning). Success means a student who lands on Ghadam leaves with a clearer picture of their options and a concrete next step — not just a list of links.

## Brand Personality

Warm, guiding, human. The tone is a knowledgeable friend who has already done this — not a government portal, not a generic SaaS dashboard. Encouraging without being patronizing. Confident without being cold. The product is proud of being built for Iranians; it should feel culturally specific, not a localized clone of a Western tool.

## Anti-references

- **Persian government sites**: dense, cluttered, bureaucratic, formally hostile. Ghadam must never feel like a ministry form.
- **Western study-abroad tools (Mastersportal, DAAD website itself)**: blue-heavy, generic "international student" aesthetic, no cultural specificity, as if the user's identity doesn't matter. Ghadam should feel built for its users, not adapted for them.
- **Generic SaaS cream-card dashboards**: over-rounded cards, warm-tinted near-white backgrounds, generic geometric sans, could be any B2B tool. The product has a specific cultural context; the design should reflect that.

## Design Principles

1. **Clarity at every stage.** The user is often anxious. Every screen should answer one clear question: "What do I do next?" Reduce cognitive load ruthlessly — one primary action per view, progressive disclosure over information dumps.
2. **Cultural specificity is a feature.** RTL is not a layout direction, it's a first-class design axis. Typography, spacing, and visual rhythm should feel native in Persian, not translated. Don't default to LTR logic then flip.
3. **Trust is earned through data transparency.** Recommendations and scores must show their reasoning. Shared experiences must feel moderated and credible, not like a spam feed. Trustworthiness is a design quality, not just a content quality.
4. **Human stories beside structured data.** A program's deadline and GPA cutoff are necessary but not sufficient. The community experience layer should be visible alongside — not buried — in planning flows. Numbers and stories belong together.
5. **Progress, not just information.** The product is about moving forward. UI should reinforce momentum: show what's done, what's next, what's possible. The tracker isn't a spreadsheet; it's a companion through a high-stakes process.

## Accessibility & Inclusion

- WCAG AA minimum throughout: 4.5:1 body text contrast, 3:1 large text, keyboard navigability, screen reader semantics.
- RTL/LTR bidirectionality is a first-class requirement. Every layout, spacing, icon direction, and animation must be tested in both directions. Logical CSS properties (`margin-inline`, `padding-inline-start`, etc.) over physical ones.
- `prefers-reduced-motion` respected throughout. Framer Motion animations must have reduced-motion alternatives (crossfade or instant).
- Persian (`Vazir` font) and Latin (`Manrope`/`Space Grotesk`) font stacks must both render legibly at all weights in use.
