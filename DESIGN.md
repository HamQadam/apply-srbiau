---
name: Ghadam
description: Persian-first academic immigration planning — warm, guiding, human.
colors:
  persian-teal: "#0d7377"
  persian-teal-deep: "#095f62"
  persian-teal-light: "#14a8ae"
  emerald-guide: "#0ea573"
  emerald-guide-deep: "#0b8a5e"
  ink: "#111827"
  ink-secondary: "#374151"
  ink-muted: "#6b7280"
  surface-bg: "#f5f7fa"
  surface-white: "#ffffff"
  surface-elevated: "#f8fafc"
  border-default: "#e2e8f0"
  status-success: "#10b981"
  status-warning: "#f59e0b"
  status-danger: "#ef4444"
  status-info: "#3b82f6"
  inverse-bg: "#020617"
  inverse-text: "#f8fafc"
  dark-bg: "#0c0f14"
  dark-surface: "#141920"
  dark-elevated: "#1c222a"
  dark-border: "#1e293b"
typography:
  display:
    fontFamily: "Space Grotesk, Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Space Grotesk, Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Manrope, Vazir, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "48px"
  "3xl": "64px"
components:
  button-primary:
    backgroundColor: "{colors.persian-teal}"
    textColor: "{colors.inverse-text}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.persian-teal-deep}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.persian-teal}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-elevated}"
  input-default:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
  chip-default:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  chip-active:
    backgroundColor: "{colors.persian-teal}"
    textColor: "{colors.inverse-text}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  card-default:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.md}"
    padding: "20px"
---

# Design System: Ghadam

## 1. Overview

**Creative North Star: "The Trusted Companion"**

Ghadam's visual system is built around a single idea: a knowledgeable friend who has already made this journey. Not an institution, not a government form, not a generic SaaS dashboard — a person who sat where the user sits, understood the anxiety and the hope, and emerged with clarity on the other side. The design serves that persona at every turn: warm but precise, personal without sentiment, structured without bureaucracy.

The palette is anchored in Persian Teal — a considered blue-green that nods to Iranian tilework and mosaic tradition without being decorative. It reads as authority and trustworthiness while carrying the cultural specificity the product earns. The typography pairs Space Grotesk (structured, geometric, direct) with Manrope (warm, readable, generous) and Vazir (Persian-native, never an afterthought). Together they say: "This was built for you, not adapted for you."

The system explicitly rejects three failure modes named in PRODUCT.md. Persian government sites: dense, cluttered, formally hostile. Generic Western study-abroad tools (Mastersportal, the DAAD site itself): blue-heavy, no cultural fingerprint, as if the user's identity doesn't matter. Generic SaaS cream-card dashboards: over-rounded corners, warm-tinted near-white backgrounds, indistinguishable from any B2B tool. None of those. Ghadam is specific. Ghadam is Persian-first. Ghadam knows who it's for.

**Key Characteristics:**
- Culturally specific palette: Persian Teal, not generic corporate blue
- Bidirectional layout as a first-class axis, not a retrofit
- Tonal layering for depth — shadows only on hover/active, never at rest
- Typography pairs geometric structure (Space Grotesk) with warm legibility (Manrope + Vazir)
- Cards with honest corners: 12px, not 24–40px over-rounding
- Status colors that earn their place: urgency for deadlines, calm for progress, never decorative

## 2. Colors: The Persian Teal Palette

A two-accent palette: Persian Teal as the primary trust signal, Emerald Guide as the progress/success layer. Neutrals are cool-tinted with near-zero chroma — not warm sand, not generic gray.

### Primary
- **Persian Teal** (`#0d7377`): The brand's core. Used on primary buttons, active navigation, links, progress indicators, focus rings. The color of decision and direction.
- **Persian Teal Deep** (`#095f62`): Hover and pressed state for primary elements. Also used for text-on-light where Teal needs more contrast punch.
- **Persian Teal Light** (`#14a8ae`): Secondary links, badge fills, hover glows. Lighter register of the same hue.

### Secondary
- **Emerald Guide** (`#0ea573`): The success / progress accent. Document checklist completions, match score indicators, "done" states. Distinct from Teal but harmonious — both read as forward motion.
- **Emerald Guide Deep** (`#0b8a5e`): Hover/active for emerald surfaces. Status-success text on light backgrounds.

### Tertiary
- **Status Warning** (`#f59e0b`): Deadline approaching (7–30 days). Amber, not orange — serious but not alarm.
- **Status Danger** (`#ef4444`): Deadline overdue or critical. Only appears when the user needs to act immediately.
- **Status Info** (`#3b82f6`): Informational callouts. Use sparingly alongside Teal to avoid color conflict.

### Neutral
- **Ink** (`#111827`): Primary body text. Near-black, not true black — warmer but still high contrast (14:1+ on white).
- **Ink Secondary** (`#374151`): Secondary text: supporting labels, subtitles, metadata. Still comfortably above 7:1 on surface-white.
- **Ink Muted** (`#6b7280`): Muted text, placeholders, iconography at rest. Check contrast: 4.5:1 minimum required; verify against actual background.
- **Surface Background** (`#f5f7fa`): Page body background. Slightly blue-tinted, not warm — resists the cream/sand default.
- **Surface White** (`#ffffff`): Card and panel backgrounds. Sits on top of Surface Background to create tonal layering depth.
- **Surface Elevated** (`#f8fafc`): Elevated state (secondary panels, dropdown backgrounds, hover states within Surface White).
- **Border Default** (`#e2e8f0`): Dividers, card outlines, input stroke. Visible but not dominant.
- **Inverse Background** (`#020617`): Dark-mode body background. Near-pure dark, tinted cool.

### Named Rules
**The No-Warm-Sand Rule.** The background is `#f5f7fa` — cool-tinted, not warm. Warm near-whites (cream, linen, bone, parchment) are forbidden regardless of what they're called. "Warmth" in the brand is carried by Teal, typography, and community content, not by a beige page.

**The One Teal Rule.** Persian Teal touches ≤20% of any given screen. Its presence signals action, importance, or identity. When everything is teal, nothing is. The rest of the surface is neutral or Emerald Guide for progress.

## 3. Typography

**Display Font:** Space Grotesk 500–700 (with Manrope, system-ui as fallback)
**Body Font:** Manrope 400–700 (with Vazir for Persian, system-ui as fallback)
**Persian Font:** Vazir 400 (loaded locally via `@font-face`)

**Character:** Space Grotesk brings geometric authority to headings — structured, confident, slightly quirky. Manrope offers warmth and readability at body sizes; it's humanist enough to feel personal without being casual. Vazir is the Persian-native voice: it's not a translation, it's a first-class inhabitant of the same design language. The three work together because they're all on the generous-legible end of their respective categories rather than the cold-technical end.

### Hierarchy
- **Display** (700, `clamp(2rem, 5vw, 3.5rem)`, line-height 1.1, letter-spacing -0.02em): Hero headings, page titles on full-bleed sections. Space Grotesk. Max 3.5rem — the product doesn't shout.
- **Headline** (600, `clamp(1.5rem, 3vw, 2rem)`, line-height 1.25, letter-spacing -0.01em): Section headings, card headers, modal titles. Space Grotesk.
- **Title** (600, 1.125rem / 18px, line-height 1.4): List item labels, sidebar headings, form section titles. Manrope.
- **Body** (400, 1rem / 16px, line-height 1.65): All prose text, descriptions, help copy. Manrope / Vazir. Cap line length at 65–75ch.
- **Label** (500, 0.75rem / 12px, letter-spacing 0.01em): Tags, badges, status chips, metadata pairs. Manrope. Not uppercase-tracked — this is 2024, not 2019.

### Named Rules
**The Persian-First Rule.** Every layout decision — icon direction, padding rhythm, text alignment, animation direction — must be validated in RTL before LTR. Use logical CSS properties (`padding-inline-start`, `margin-inline-end`, `inset-inline-start`) throughout. Persian is not a variant; it is the first form.

**The Ceiling Rule.** No display heading exceeds 3.5rem (56px). No letter-spacing tighter than -0.02em on display type. At -0.04em the letters touch; at -0.02em the spacing is tight but intentional. Space Grotesk's geometric forms handle tight tracking well — stop there.

## 4. Elevation

Ghadam uses tonal layering as its primary depth language. Shadows are reserved exclusively for interactive state transitions: a card that lifts on hover communicates response; a card with an ambient shadow at rest communicates noise. Flat by default, lifted on interaction.

Three background steps create the layer hierarchy:
- **Layer 0 — Page Background**: `#f5f7fa` (Surface Background). The canvas.
- **Layer 1 — Surface**: `#ffffff` (Surface White). Cards, panels, dialogs, main content containers.
- **Layer 2 — Elevated**: `#f8fafc` (Surface Elevated). Hover states within a Surface, dropdown backgrounds, secondary panels sitting on top of Layer 1.

Dark mode mirrors this with three dark steps: `#0c0f14` → `#141920` → `#1c222a`.

### Shadow Vocabulary
- **Hover Lift** (`0 4px 16px rgba(13, 115, 119, 0.10)`): Applied on `hover` to interactive cards (ProgramCard, ExperienceCard). The tint uses Persian Teal, not black — the glow is brand-warm, not generic.
- **Modal Ambient** (`0 8px 32px rgba(2, 6, 23, 0.18)`): Dialog and drawer overlay. Only shadow that appears at rest (dialogs are elevated above the normal layer stack by design).
- **Dropdown Lift** (`0 4px 12px rgba(2, 6, 23, 0.12)`): Position-fixed dropdowns and comboboxes. Small, directional, not diffuse.

### Named Rules
**The Flat-At-Rest Rule.** Surfaces carry no shadow at rest. A card that always has a shadow is furniture; a card that lifts on hover is interactive. If it's interactive, it lifts. If it doesn't lift, remove the shadow entirely.

**The One Shadow Per Element Rule.** Never pair `border: 1px solid` with `box-shadow` that has a blur ≥ 16px. Pick one signal. Border when structure is needed. Shadow when lift state is needed. Both together is the ghost-card anti-pattern.

## 5. Components

### Buttons
The tactile agreement of the interface: precise corners, enough padding to feel deliberate, no decorative shadows at rest.

- **Shape:** Gently curved (8px radius — not pill, not square)
- **Primary:** Persian Teal background (`#0d7377`), white text (`#f8fafc`), `padding: 10px 20px`, font-weight 500. No border, no shadow at rest.
- **Hover / Focus:** Background shifts to Persian Teal Deep (`#095f62`); `transform: translateY(-1px)` with `transition: all 150ms ease-out`. Focus ring: 2px Persian Teal, 2px offset. No blur.
- **Ghost:** Transparent background, Persian Teal text, 1px Persian Teal border. Hover fills to Surface Elevated (`#f8fafc`).
- **Destructive:** Status Danger (`#ef4444`) background. Used only for irreversible actions (delete program, remove account). Never red for a "cancel" that isn't destructive.
- **Disabled:** 50% opacity on the parent, `cursor: not-allowed`. No hover transformation.

### Chips / Badges
Filter pills in Explore and status markers in the Tracker.

- **Default (filter):** Surface Elevated background, Ink Secondary text, full-radius pill, `padding: 4px 12px`. 1px Border Default border.
- **Active (selected filter):** Persian Teal background, white text. Border removed. No shadow.
- **Status badge (Tracker):** Inline, tight padding (`2px 8px`), pill radius. Color is semantic: emerald for admitted/applied, amber for in-progress, red for overdue. Background is a 10% tint of the status color, text is the full status color.

### Cards / Containers
Cards appear in the Tracker (ProgramCard) and the Experiences feed. Two card types, same container rules.

- **Corner Style:** Gently curved (12px radius). Never 24px or above; the product is a planning tool, not a children's app.
- **Background:** Surface White (`#ffffff`) on Surface Background page.
- **Shadow Strategy:** No shadow at rest. Hover Lift shadow only on hover.
- **Border:** 1px Border Default (`#e2e8f0`) at rest. Border color does not change on hover; the shadow carries the interaction signal.
- **Internal Padding:** 20px (`spacing.xl` equivalent). Consistent; do not nest a second padded container inside a card.
- **Prohibited:** Nested cards. A ProgramCard may contain badges and a progress bar; it may not contain another bordered rounded container.

### Inputs / Fields
The backbone of the matching profile, tracker forms, and filters.

- **Style:** 1px Border Default stroke, Surface White background, 8px radius. `padding: 10px 14px`.
- **Focus:** Border shifts to Persian Teal (1px → 2px effectively via outline/ring). `ring-2 ring-persian-teal ring-offset-2`. No glow, no shadow.
- **Error:** Border shifts to Status Danger. Error message below in Status Danger color, font-size label (12px). Error text must meet 4.5:1 contrast against Surface Background.
- **Disabled:** 50% opacity, `cursor: not-allowed`, `background: Surface Elevated`.
- **RTL inputs:** `text-align: start` (not `right`). Search icon / leading icon: `inset-inline-start`. Trailing clear button: `inset-inline-end`.

### Navigation (Navbar)
Sticky, backdrop-blurred, 64px height. The nav is the product's north star in microcosm: restrained, clear, always available.

- **Background:** Surface White at 90% opacity with `backdrop-filter: blur(8px)`. Bottom border: 1px Border Default.
- **Logo:** "Ghadam" in Space Grotesk Bold, Persian Teal. No emoji in production; a proper SVG mark is pending.
- **Nav links:** Body size (16px), Manrope 500. Ink Secondary at rest. Persian Teal on active (current route) — underline-style active indicator preferred over background pill.
- **Active indicator:** 2px Persian Teal underline below the active link (not a background chip). Distinguishes navigation from action buttons.
- **Mobile:** Full-screen overlay menu. `position: fixed`, covers the viewport, `z-index: 50`. Backdrop does not scroll. Animation: slide-in from the start edge (inline-start), not from top — respects RTL direction.

### Program Score Badge (Signature Component)
The match score indicator is a core, recurring UI element across Recommendations and Tracker.

- **Structure:** Pill badge, `padding: 2px 8px`, `border-radius: 9999px`, `font-size: 12px`, `font-weight: 500`.
- **Color logic:** Score ≥ 75 → Emerald Guide tint (emerald background at 10%, text at emerald-deep). Score 50–74 → amber tint. Score < 50 → neutral tint (Surface Elevated, Ink Muted text). Never red for match score — a low score is information, not an error.
- **Always inline:** Never floated, never positioned absolutely within a card header. It precedes the program name as inline context.

## 6. Do's and Don'ts

### Do:
- **Do** use Persian Teal (`#0d7377`) as the sole primary action color. It is specific and recognizable; its rarity is part of its meaning.
- **Do** use logical CSS properties (`padding-inline-start`, `margin-inline-end`, `inset-inline-start`) throughout. Physical properties (`padding-left`, `margin-right`) are prohibited in any layout file.
- **Do** validate every layout in RTL before shipping. Persian is the first language; RTL is the canonical direction.
- **Do** use `text-wrap: balance` on h1–h3 and `text-wrap: pretty` on body prose to prevent orphans in both FA and EN.
- **Do** use tonal layering for depth: Surface Background → Surface White → Surface Elevated. The three-step stack is the entire elevation system.
- **Do** keep card corners at 12px (`rounded.md`). The product handles serious planning decisions; 8–12px says "precise tool."
- **Do** respect `prefers-reduced-motion`. Every Framer Motion animation needs a `@media (prefers-reduced-motion: reduce)` alternative: crossfade or instant.
- **Do** add a Hover Lift shadow (`0 4px 16px rgba(13, 115, 119, 0.10)`) to interactive cards on hover. The teal tint makes the lift feel branded, not generic.
- **Do** use Vazir for Persian text at body and label sizes. Never render Persian in Manrope or Space Grotesk as a fallback — Vazir is loaded locally for this reason.

### Don't:
- **Don't** use warm-tinted near-white backgrounds. The cream/sand/paper band (warm-tinted near-whites) is prohibited. `#f5f7fa` is cool-tinted; do not "warm it up."
- **Don't** make this look like a Persian government site: no dense information dumps, no formal bureaucratic copy, no table-of-contents-as-UI.
- **Don't** make this look like Mastersportal or generic Western study-abroad tools: no generic navy-blue palette, no "international student" stock imagery, no culturally neutral design that could serve any country.
- **Don't** pair `border: 1px solid` with a `box-shadow` blur ≥ 16px on the same element. The ghost-card pattern reads as unresolved. Pick one signal: border for structure, shadow for lift.
- **Don't** use `border-radius` ≥ 24px on cards, inputs, or panels. Full pill is acceptable on chip/badge elements only.
- **Don't** use gradient text (`background-clip: text` with a gradient). Emphasis through weight or color shift only.
- **Don't** use `border-left` or `border-right` ≥ 2px as a colored stripe accent on cards or list items. Rewrite with full borders, background tints, or leading icons.
- **Don't** use eyebrow text on every section (small all-caps wide-tracked labels like "ABOUT" / "PROCESS" above every heading). One deliberate kicker pattern can be a brand system; automatic eyebrows on every section is AI grammar.
- **Don't** add numbered section markers (01 / 02 / 03) as default scaffolding. Numbers carry meaning only for actual sequences.
- **Don't** use `z-index: 999` or `z-index: 9999`. The z-index scale is: dropdown (10) → sticky nav (50) → modal-backdrop (80) → modal (90) → toast (100) → tooltip (110).
- **Don't** render placeholder text below 4.5:1 contrast. Ink Muted (`#6b7280`) on Surface White is ~4.6:1 — acceptable at the margin. Do not go lighter.
