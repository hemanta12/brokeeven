# Design System

**Status:** Approved v1
**Owner:** Hemanta
**Companion docs:** PRD.md, TECH_STACK.md, APP_FLOW.md
**Last updated:** 2026-08-23

---

## 1. Direction

A ledger, not a dashboard. The subject is a running record of who paid and who owes — so the design leans on the real vernacular of accounting: green-bar ledger paper, ink, tabular figures, a paid-invoice stamp. Fast and legible first; personality lives in a few deliberate details, not everywhere.

**Deliberately not used:** the portfolio's "Deep Winter Editorial" identity (Cormorant Garamond, centered editorial layout) — that's a personal-brand look for a different kind of subject. This is a utility someone opens mid-dinner to settle a bill; it should feel quick, not literary.

**Self-check against generic AI-design defaults:** avoided the cream-background/serif/terracotta combo (shifted background cooler toward pale green-bar rather than warm cream, and the debt accent is a deeper brick red, not the peachy terracotta that shows up everywhere). Avoided the dark-mode/acid-accent look entirely (this stays light). The row hairlines borrow from the broadsheet/ledger idea but stay rounded and green-bar-banded rather than zero-radius newsprint, so it doesn't collapse into that default either. On typography specifically: Fraunces is itself a high-contrast serif, the same family of face the generic cream/serif/terracotta default reaches for — what keeps it from collapsing into that default is restraint (a handful of moments per screen, never body copy) and the pairing with a dedicated monospace data face (Plex Mono) driven by the ledger metaphor itself, not just palette distance from the cream/terracotta combo.

## 2. Color Palette

| Name | Hex | Usage |
|---|---|---|
| Ledger Paper | `#E6F1E2` | App background — pale, warm green-bar paper tone |
| Paper White | `#F8FBF5` | Cards, overlays, elevated surfaces |
| Ink Forest | `#1E2E23` | Primary text, icons, primary button fill |
| Ledger Green | `#2F6B4F` | "You're owed" / credit — badges, large numerals, stamp accent |
| Debt Red | `#A8402B` | "You owe" / debt — badges, large numerals |
| Brass | `#B8912B` | Structural accent — dividers, stamp ink (decorative only) |
| Brass (UI) | `#96762A` | Focus rings and any other load-bearing UI use — darkened from decorative Brass to clear the 3:1 non-text contrast floor against both backgrounds |

Color is never the only signal for owe/owed — always paired with a `+`/`−` sign or an "owed to you" / "you owe" label, for colorblind accessibility and just clarity in general.

## 3. Typography

Three faces, each with a job:

| Role | Face | Where |
|---|---|---|
| Display | **Fraunces** | Group names, page titles, the settle-up stamp. Used with restraint — a handful of moments per screen, never body copy. |
| Body / UI | **IBM Plex Sans** | Everything else — labels, buttons, nav, member names, notes. |
| Data | **IBM Plex Mono** | Every dollar amount, every balance. Monospace means figures line up in columns the way a real ledger does — this isn't decorative, it's why the numbers stay scannable. |

**Scale (root 16px, values in rem so mobile text-size settings and 200% zoom reflow correctly — never hardcode px for font-size):**
- Display / group name: Fraunces, 2rem, weight 600
- Section headers ("Expenses", "Balances"): Plex Sans, 1.125rem, Semibold
- Body: Plex Sans, 1rem, Regular
- Labels / member names / timestamps: Plex Sans, 0.875rem, Medium
- Hero balance ("You owe $42.50"): Plex Mono, 1.75rem, Medium, tabular figures
- Expense-row amounts: Plex Mono, 1rem, Regular, tabular figures

## 4. Layout

- Single centered column, max-width ~520px, even on desktop. A ledger is a narrow bound page, not a wide dashboard — the width itself is part of the metaphor, and it keeps the app equally at home on mobile, where it'll mostly be used.
- Expense rows separated by 1px Ink Forest hairlines at low opacity, with a faint alternating background tint between Ledger Paper and Paper White — the green-bar effect, and a real aid for scanning a long list.
- Cards and buttons: rounded corners (8–10px radius), one soft shadow reserved for modals only. Everything else stays flat — paper, not glass.

## 5. Signature Element: The Settle-Up Stamp

**MVP status — confirmed:** ships as a plain static "Settled" badge, no animation, for MVP (Phase 4). The full stamp below is deferred to a later polish pass, not a build blocker.

Marking a balance settled stamps it — a rotated (–8°) brass-and-red ink stamp reading "SETTLED" in Fraunces caps, with a rough double-ring border suggesting a real rubber stamp. A quick 150–200ms scale-and-rotate-in on confirm, from `scale(0.9)`/`opacity: 0` with a custom `ease-out` curve (`cubic-bezier(0.23, 1, 0.32, 1)`) — not the default CSS ease and never `scale(0)`; falls back to appearing instantly with `prefers-reduced-motion`. This is the one moment the design spends its boldness — everything else stays quiet on purpose.

## 6. Motion

Restrained, two moments only:
1. The settle-up stamp (§5).
2. A brief background-color pulse (Ledger Green or Brass), 250ms `ease-out` as a CSS transition (not a keyframe, so overlapping live updates retarget smoothly), on a row that just updated via real-time sync — catches the eye without being distracting. **One-shot only, fired by the update event** — never implement as a continuously looping pulse (e.g. `animate-ping`); that reads as a generic "live" status dot, not a ledger update.

Both respect `prefers-reduced-motion` — no animation, just the end state.

## 7. Core Components (brief)

- **Primary button** (Ink Forest fill, Paper White text, Plex Sans Semibold, rounded, contrast-safe double focus ring, `:hover` darkens fill ~8%, `:active` adds `scale(0.97)`) — **reserved for one action per screen.** On Group View that's **Add Expense** (the day-to-day action). Settle Up and Share invite link use the secondary style instead, so Group View has exactly one high-contrast call-to-action, not three competing ones.
- **Secondary/ghost button** (Ink Forest text/outline on transparent, `:hover` fills with Ledger Paper tint, `:active` adds `scale(0.97)`) — **Settle Up** on the Balances tab; also the general secondary style elsewhere.
- **Tertiary/icon action**: **Share invite link** — a small icon-plus-label affordance near the header, not a full button, so it doesn't compete visually with Add Expense.
- **Group View tabs**: semantic Expenses/Balances tabs below the member chips. Expenses is the default tab; tab state is local UI state only. Settle Up appears on Balances; Add Expense remains bottom-anchored and persistent.
- **Expense row**: description + payer (Plex Sans) left, amount (Plex Mono, tabular) right, hairline below.
- **Balance row**: "Name owes Name" (Plex Sans) + amount (Plex Mono, colored by direction) + Settle button (secondary style, per above).
- **Member chip**: name in Plex Sans Medium, small, rounded pill, Ink Forest outline; "you" gets a subtle Brass underline instead of extra decoration.

## 8. Copy & Voice

- Active voice, plain verbs: "Add expense," not "Submit." A button's label and its resulting state match — "Settle Up" → "Settled."
- Errors state what happened and how to fix it, no apology: "Group not found — check the code and try again."
- Empty states are an invitation, not a mood: "No expenses yet — add the first one."

## 9. Forms & Input Fields

Every form in the app (Create Group, Add Person, Add Expense, Settle Up, Join code) follows the same rules:

- **Single column, vertical.** No side-by-side fields, except the split-participant amount inputs, which are genuinely one entity (one person's share) repeated per row, and the approved Add/Edit Expense `Paid by` + `Date` pair. The pair remains equal-width above 360px and stacks below 360px.
- **Persistent labels above the input**, always — never a placeholder standing in for a label. Placeholder text, when used at all, holds an example value only (e.g. "Venmo, cash…") and disappears as content, not as the field's only identifier.
- **Validation fires on blur**, not on keystroke — a field is checked when focus leaves it. The one exception is the percent/custom split sum check (APP_FLOW §4), which can only be evaluated once all participant amounts exist, so it validates on save; still non-blocking until then.
- **Typed data is never discarded on a validation error** — the field keeps what the user entered so they can fix it in place.
- Fields, by form:
  - Amount: `type="text"` with `inputmode="decimal"` (not `type="number"`, which blocks a leading `.` and adds unwanted spinners) — pairs with `Intl.NumberFormat` display below.
  - Name fields (your name, add person): `autocomplete="name"`, `autocorrect="off"`, `autocapitalize="words"`.
  - Join-code field: `autocomplete="off"`, `spellCheck={false}`, `autocorrect="off"`, `autocapitalize="characters"`, `inputmode="text"`.
  - Settle-up note: plain text, no special `inputmode`; expense notes are not an MVP capability.
- Add/Edit Expense uses one required Description field. Paid by and Date are paired controls; Date uses a labeled native `input type="date"` and submits an ISO calendar date.
- Percent/custom split rows show an em dash until their value is resolvable, plus a live entered/remaining summary. At least one participant is required.
- All members, including the payer, are selected by default. The payer may be deselected; if uneven rounding creates leftover cents, those cents go to the first selected participant in deterministic split order.

## 10. Accessibility & Quality Floor

- Responsive down to small mobile screens (this is the primary use case, not an afterthought).
- **Touch targets:** minimum 44×44pt (iOS) / 48×48dp (Android); absolute floor 24×24 CSS px with 24px offset spacing between adjacent targets. Applies to member chips, split-participant checkboxes, and expense-row tap areas — pad the hit area beyond the visual glyph where the icon itself is smaller.
- **Primary action placement:** Add Expense (the one primary CTA, per §7) sits reachable by thumb — a bottom-anchored bar on small mobile widths, not buried at the top of a tall scrolling view.
- Visible keyboard focus (a contrast-safe double-ring via `:focus-visible` not `:focus`) on every interactive element. The outer ring must contrast with the surrounding surface and the inner ring must contrast with the focused control; Brass-UI `#96762A` is used where it meets both requirements.
- Full-page overlays trap focus, lock background scrolling, restore focus to the launching control, respect safe-area insets, and support Escape as an equivalent close action. A dirty form requires discard confirmation before closing.
- Group View tabs use semantic tab roles and keyboard arrow navigation; the selected tab is communicated with `aria-selected`.
- `prefers-reduced-motion` respected everywhere motion is used.
- Direction (owe/owed) always carries a text label or sign, never color alone.
- **Multimodal confirmation:** the Settle-Up stamp and expense-save confirmation pair their visual state change with a short `navigator.vibrate(15)` haptic pulse on devices that support it (feature-detected, silently skipped otherwise) — useful since a thumb often covers the screen at the moment of the tap.

**Build notes (added at design council review, 2026-08-23):**
- All dollar amounts via `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`, not hand-built strings.
- All dates via `Intl.DateTimeFormat`, not hardcoded formats.
- Member/expense counts as numerals ("3 members," not "three").
- Field-level `autocomplete`/`inputmode`/`autocorrect` attributes are specified per-field in §9, not just for the join-code field.

## 11. Tailwind Token Mapping (for build time)

```js
// tailwind.config.js — theme.extend
colors: {
  'ledger-paper': '#E6F1E2',
  'paper-white':  '#F8FBF5',
  'ink-forest':   '#1E2E23',
  'ledger-green': '#2F6B4F',
  'debt-red':     '#A8402B',
  'brass':        '#B8912B',
  'brass-ui':     '#96762A',
},
fontFamily: {
  display: ['Fraunces', 'serif'],
  sans:    ['"IBM Plex Sans"', 'sans-serif'],
  mono:    ['"IBM Plex Mono"', 'monospace'],
},
fontSize: {
  'display':      '2rem',     // group name, page titles (§3)
  'section':      '1.125rem', // section headers
  'body':         '1rem',
  'label':        '0.875rem', // labels, member names, timestamps
  'hero-balance': '1.75rem',
  'row-amount':   '1rem',
},
```
All font sizes are `rem`, not `px` — required so mobile OS text-size settings and 200% browser zoom reflow correctly without clipping (never override with a hardcoded px value at component level).

Enable tabular figures on the mono face wherever amounts render (`font-variant-numeric: tabular-nums` or the Plex Mono `tnum` feature).

---

## Open Items to Confirm

*(none — direction and approved interaction decisions confirmed 2026-08-23. Safe to start Phase 4 token/component work.)*

Resolved (2026-08-23 grill session): signature stamp interaction — MVP ships a plain static badge (§5), full animated stamp deferred to polish pass.

Resolved (2026-08-23 design council): Brass contrast, motion easing gaps, i18n/focus build notes — see below.

Resolved (2026-08-23 UIUX_rules.md checklist pass): pulse duration cut to 250ms (Doherty Threshold), one-primary-CTA hierarchy fixed on Group View (Hick's Law — Add Expense primary, Settle Up secondary, Share invite link tertiary), new §9 Forms section (single-column/persistent-labels/on-blur validation), type scale converted px→rem (mobile reflow), touch-target minimums and thumb-reachable primary-action placement added to §10, per-field `inputmode`/`autocomplete`/`autocorrect` specified, haptic confirmation added for stamp/settle.
