# Design System

**Status:** Approved v2 (visual language replaced in sketch rounds 001 to 015)
**Owner:** Hemanta
**Companion docs:** PRD.md, TECH_STACK.md, APP_FLOW.md
**Last updated:** 2026-09-05

---

## 1. Direction

A ledger, not a dashboard. The subject is a running record of who paid and who owes. Fast and legible first; personality lives in a few deliberate details, not everywhere.

**Revised after sketch round 006.** The original direction leaned on the literal vernacular of accounting: green-bar ledger paper, a serif display face, a paid-invoice stamp. All three read dated and, in the owner's words, "AI generated", and all three are gone. What survives is the part that was never decoration: **tabular figures used at display scale.** The organising idea is that **"BrokeEven" names the product's goal state, `$0.00`**: every balance in the app is trying to reach zero.

The shape it took instead: white controls on a tinted ground, one sans family with its mono companion, and one dark band used exactly twice.

**Deliberately not used:** the portfolio's "Deep Winter Editorial" identity (Cormorant Garamond, centered editorial layout). That is a personal-brand look for a different kind of subject. This is a utility someone opens mid-dinner to settle a bill; it should feel quick, not literary.

**Self-check against generic AI-design defaults.** The cream/serif/terracotta combo is avoided, and so is the dark-mode/acid-accent look: this stays light. The two tells the original version of this document argued its way around, a high-contrast display serif and a saturated background hue, were removed outright in round 006 rather than defended. What is left that could still read as a default is the tinted ground, and the answer there is that it is barely tinted at all: `#F0F2F0` sits 2 points of green channel above red and blue, which is a hue you notice only next to white.

## 2. Color Palette

**The page ground is tinted and controls are white.** Settled in sketch 012
after a study of five collected app UIs produced one structural finding: every
good reference puts white cards on a tinted ground, and none uses white on
white. The old `#FCFCFB` / `#FFFFFF` pair was a dL* 0.4 non-difference, which
is why cards had been forced to depend entirely on their border.

Judge surface-versus-surface steps by **dL\***, not contrast ratio. Ratio
compresses every near-white pair into a meaningless 1.0 to 1.2 band. Contrast
ratio still governs text and control boundaries, where WCAG defines it.

| Token | Hex | Usage |
|---|---|---|
| `bg` | `#F0F2F0` | Page ground. Tinted, not near-white |
| `surface` | `#FFFFFF` | Cards, fields sitting on the ground |
| `sunken` | `#E7ECE7` | The tinted fill *inside* a white card: entry rows, the segmented track, fields on a white sheet |
| `desk` | `#E2E8E2` | >=640px, behind the raised sheet. The sheet itself is `bg`, not `surface`: it **is** the page, so a white sheet would leave every card and control on it with nowhere to be raised from |
| `ink` | `#12140F` | Primary text and icons |
| `dim` | `#5B6360` | All secondary text. One value, not six ad-hoc ink opacities |
| `line` | `#E3E8E3` | Decorative rules only. 1.22:1, so it can never bound a control |
| `line-strong` | `#7F887F` | Anything that bounds a control: inputs, checkboxes, outlined buttons. 3.66:1 on white, 3.26:1 on the ground |
| `accent` | `#0A6B42` | "You're owed", primary button fill, links, step numbers |
| `accent-hover` | `#0C7A4C` | Primary button hover |
| `accent-wash` | `#DCE9E1` | Selected-row fill, the balance block, the real-time row pulse |
| `mint` | `#3DDC91` | **Fills on the band only.** 1.77:1 on white, so never text on a light surface |
| `down` | `#BE3623` | "You owe". 5.0:1 on the ground |
| `down-wash` | `#F7DFDB` | The settle-up amount chip |
| `notice` | `#7A5E12` | Semantic amber only: the overpayment warning and the activity edit/rename tags |
| `notice-wash` | `#F4EBD3` | Overpayment warning fill |
| `band` | `#123322` | **One device, used twice**: the landing proof band and the GroupPage header. Anything dark added later uses this token or it reads as an accident |
| `band-dim` | `#A9BBAE` | Secondary text on the band, and the **only** colour for a control boundary sitting on it. White at 22% composites to `#465F53`, which is 2.0:1 and fails WCAG 1.4.11 |
| `focus` | `#12140F` | Focus ring. Deliberately not the accent |
| `scrim` | ink at 45% | Behind a compact overlay |

Colour is never the only signal for owe/owed. `<Amount>` pairs it with a
`+`/`−` sign, and with a caption above the figure ("you lent" / "you owe")
where there is room. Zero is neutral ink, not success green.

**Person colours** live in `components/Avatar.tsx`, not here: five hues hashed
from the name so the same person is the same colour everywhere with nothing
stored. All five clear 4.5:1 with a white initial, and the set deliberately
excludes red and amber so a member never reads as a warning.

## 3. Typography

**One family plus its mono companion.** The Newsreader/Libre Franklin pair,
and the serif display face generally, were dropped in sketch round 006: serif
display plus sans is the saturated "editorial typographic" lane, and the
identity argument for keeping it only held while it had been deliberately
chosen, which it had not.

| Role | Face | Where |
|---|---|---|
| Display / UI / body | **Geist** | Everything. Hierarchy comes from weight and size, not from a second family. `.heading` is Geist 600 at `-0.02em`. |
| Data | **Geist Mono** | Every dollar amount the app *shows*, via `<Amount>`. Tabular by construction. |

What survived the reimagining is the part that was never decoration: **tabular
figures used at display scale.** Money the user is *typing* stays Geist with
`tabular-nums`; mono is for money the app is showing back.

Display tracking floor is **-0.04em**. Tighter and the glyphs touch.

**Scale** (root 16px, rem throughout so OS text-size settings and 200% zoom
reflow correctly; see §11 for the token names):

- Display / page titles: 2rem, weight 600, `-0.02em`
- Title (overlay h2, navbar wordmark): 1.375rem
- Section headers: 1.125rem
- Body: 1rem
- Hero balance: 1.75rem, Geist Mono, semibold
- Row amounts: 1rem, Geist Mono, semibold
- Labels: 0.875rem
- Micro (captions, timestamps, group meta): 0.8125rem

Both faces are self-hosted, Latin subset only, as single variable woff2 files
in `public/fonts/`. The sans is preloaded in `index.html`.

## 4. Layout

- Single centered column, max-width ~520px, even on desktop. A ledger is a narrow bound page, not a wide dashboard: the width itself is part of the metaphor, and it keeps the app equally at home on mobile, where it'll mostly be used.
- Expense and balance rows are **bordered white cards on the tinted ground**, separated by a gap rather than by hairlines. The green-bar alternating tint is gone with the rest of the paper metaphor; the card-versus-ground relationship is what does the scanning work now.
- Radius comes from two tokens and nowhere else: `radius-card` (14px) for cards and sheets, `radius-inner` (10px) for anything inside one. Buttons are pill shaped at every size. Shadows are reserved for raised surfaces (the desktop sheet, the straddling summary card, modals) and are tuned against `#F0F2F0`, not against white.

## 5. Signature Element: The Receipt Tear

**Killed in sketch round 001:** the settle-up stamp. A rotated brass-and-red
"SETTLED" rubber stamp read as early-2000s skeuomorphism, a picture of a stamp
bolted onto a number. Finality has to come from the figure itself.

**Adopted in sketch round 014:** the receipt tear. Two notches punched out of
the settle card's own left and right edges in the colour behind it, plus a
dashed rule between them. It survives the stamp's precedent because it is the
card being cut through rather than a picture of a receipt, and because settle
up is the only screen in the app where something is genuinely finished.

**It is a settle-up motif.** It appears on the settle card and on the settled
receipt, and nowhere else. Anywhere else it is decoration looking for a job.

## 6. Motion

Restrained, two moments only:
1. The landing page's hero figure counting down to `$0.00` once, on load. Finality comes from the number resolving, not from a badge (§5).
2. A brief background-color pulse (`accent-wash`), 250ms `ease-out` as a CSS transition (not a keyframe, so overlapping live updates retarget smoothly), on a row that just updated via real-time sync. It catches the eye without being distracting. **One-shot only, fired by the update event.** Never implement it as a continuously looping pulse (e.g. `animate-ping`); that reads as a generic "live" status dot, not a ledger update.

Both respect `prefers-reduced-motion`: no animation, just the end state.

## 7. Core Components (brief)

- **Primary button** (`accent` fill, white text, Geist Semibold, pill, contrast-safe double focus ring, `:hover` darkens fill ~8%, `:active` adds `scale(0.97)`). **Reserved for one action per screen.** On Group View that's **Add Expense** (the day-to-day action). Settle Up and Share invite link use the secondary style instead, so Group View has exactly one high-contrast call-to-action, not three competing ones.
- **Secondary/ghost button** (`ink` text on a `surface` fill with a `line-strong` outline, `:hover` fills with `sunken`, `:active` adds `scale(0.97)`). **Settle Up** on the Balances tab; also the general secondary style elsewhere.
- **Tertiary/icon action**: **Share invite link**, a small icon-plus-label affordance near the header, not a full button, so it doesn't compete visually with Add Expense.
- **Group View tabs**: semantic Expenses/Balances tabs below the member chips. Expenses is the default tab; tab state is local UI state only. Settle Up appears on Balances; Add Expense remains bottom-anchored and persistent.
- **Expense row**: the payer's avatar, then title + "X paid" (Geist) left, amount (`<Amount>`, Geist Mono) right, in a bordered white card.
- **Balance row**: "Name owes Name" (Geist) + amount (`<Amount>`, coloured and signed by direction) + Settle button (secondary, `size="sm"`).
- **Member chip**: an `<Avatar>` then the name in Geist Medium, in a small `line-strong` pill; "you" gets an `accent` ring on the circle rather than an underline under the name.
- **Sign-in prompt** (`features/auth/SignInPrompt.tsx`, shared by the Navbar overlay and MyGroupsPage's signed-out empty state, added 2026-09-05): a headline (the app's one deliberate pun per §1, e.g. "Break even, wherever you are."), the sign-in button, three independent one-line reasons (title-only, no description sentence per item — a flowing paragraph tested worse), and a quiet one-line reassurance that it's optional. The button itself (`SignInButton.tsx`) is the app's own `secondary`/`lg` `Button`, not Google's rendered widget — Google's brand rules mean that can never match the app's own controls, and it injects asynchronously after its own script loads. It opens Google's OAuth popup directly instead.
- **Phone frame** (`HomePage.tsx`'s `PhoneFrame`, used exactly once — the landing page's real-screenshot proof). Reverses sketch 015's "no phone frame" rule for this one placement, at the owner's request: that rule was about a *div-based mock of the product*, and a frame around a genuine capture doesn't repeat it. Built to the real iPhone 15 Pro's proportions rather than a rounded rectangle by eye — 393×852pt screen in a 419×878pt body, 55pt display corner radius, 125×36.7pt Dynamic Island 11pt from the top, side-button cluster at 132/178/226pt. The capture leaves iOS's real 59pt top safe area empty; the status bar drawn into it (9:41, signal/wifi/battery) is part of the frame, not the screenshot — a captured browser viewport has no status bar of its own, and skipping this left the Dynamic Island sitting directly on the app's own navbar.

## 8. Copy & Voice

- Active voice, plain verbs: "Add expense," not "Submit." A button's label and its resulting state match: "Settle Up" becomes "Settled."
- Errors state what happened and how to fix it, no apology: "Group not found. Check the code and try again." **No em dashes in shipped copy**, or in this document.
- Empty states are an invitation, not a mood: "No expenses yet. Add the first one."
- Where copy has to defuse a specific doubt (the landing page's "Real trips are messier than that"), phrase it as the reader's own first-person words, not a third-person description — "I typed $400 instead of $40," not "someone typed the wrong amount." Naming their exact anxiety back to them lands as aimed at them; a generic scenario doesn't.

## 9. Forms & Input Fields

Every form in the app (Create Group, Add Person, Add Expense, Settle Up, Join code) follows the same rules:

- **Single column, vertical.** No side-by-side fields, except the split-participant amount inputs, which are genuinely one entity (one person's share) repeated per row, and the approved Add/Edit Expense `Paid by` + `Date` pair. The pair remains equal-width above 360px and stacks below 360px.
- **Persistent labels above the input**, always. Never a placeholder standing in for a label. Placeholder text, when used at all, holds an example value only (e.g. "Venmo, cash…") and disappears as content, not as the field's only identifier.
- **Validation fires on blur**, not on keystroke: a field is checked when focus leaves it. The one exception is the percent/custom split sum check (APP_FLOW §4), which can only be evaluated once all participant amounts exist, so it validates on save; still non-blocking until then.
- **Typed data is never discarded on a validation error.** The field keeps what the user entered so they can fix it in place.
- Fields, by form:
  - Amount: `type="text"` with `inputmode="decimal"` (not `type="number"`, which blocks a leading `.` and adds unwanted spinners). Pairs with `Intl.NumberFormat` display below.
  - Name fields (your name, add person): `autocomplete="name"`, `autocorrect="off"`, `autocapitalize="words"`.
  - Join-code field: `autocomplete="off"`, `spellCheck={false}`, `autocorrect="off"`, `autocapitalize="characters"`, `inputmode="text"`.
  - Settle-up note: plain text, no special `inputmode`; expense notes are not an MVP capability.
- Add/Edit Expense uses one required Description field. Paid by and Date are paired controls; Date uses a labeled native `input type="date"` and submits an ISO calendar date.
- Percent/custom split rows show an em dash until their value is resolvable, plus a live entered/remaining summary. At least one participant is required.
- All members, including the payer, are selected by default. The payer may be deselected; if uneven rounding creates leftover cents, those cents go to the first selected participant in deterministic split order.

## 10. Accessibility & Quality Floor

- Responsive down to small mobile screens (this is the primary use case, not an afterthought).
- **Touch targets:** minimum 44×44pt (iOS) / 48×48dp (Android); absolute floor 24×24 CSS px with 24px offset spacing between adjacent targets. Applies to member chips, split-participant checkboxes, and expense-row tap areas. Pad the hit area beyond the visual glyph where the icon itself is smaller.
- **Primary action placement:** Add Expense (the one primary CTA, per §7) sits reachable by thumb: a bottom-anchored bar on small mobile widths, not buried at the top of a tall scrolling view.
- Visible keyboard focus (a contrast-safe double-ring via `:focus-visible` not `:focus`) on every interactive element. The outer ring must contrast with the surrounding surface and the inner ring must contrast with the focused control; `--color-focus` `#12140F` is the outer ring and is deliberately NOT the accent green, so the ring around the primary CTA does not disappear into the button's own fill.
- Full-page overlays trap focus, lock background scrolling, restore focus to the launching control, respect safe-area insets, and support Escape as an equivalent close action. A dirty form requires discard confirmation before closing.
- Group View tabs use semantic tab roles and keyboard arrow navigation; the selected tab is communicated with `aria-selected`.
- `prefers-reduced-motion` respected everywhere motion is used.
- Direction (owe/owed) always carries a text label or sign, never color alone.
- **Multimodal confirmation:** the settle and expense-save confirmations pair their visual state change with a short `navigator.vibrate(15)` haptic pulse on devices that support it (feature-detected, silently skipped otherwise), useful since a thumb often covers the screen at the moment of the tap.

**Build notes (added at design council review, 2026-08-23):**
- All dollar amounts via `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`, not hand-built strings.
- All dates via `Intl.DateTimeFormat`, not hardcoded formats.
- Member/expense counts as numerals ("3 members," not "three").
- Field-level `autocomplete`/`inputmode`/`autocorrect` attributes are specified per-field in §9, not just for the join-code field.

## 11. Design Tokens (Tailwind v4, CSS-first)

There is no `tailwind.config.js`. Tailwind v4 reads its theme from an `@theme`
block in `src/styles.css`, which is the single source of truth for colour,
type, radius and shadow. Every value below is contrast-verified against the
page ground `#F0F2F0`, not against white.

**Silent-failure warning.** Tailwind v4 emits nothing at all for an unknown
colour utility: no warning, no build error, and `npm run build` still
succeeds. A green build is not proof that a rename landed. The only real gate
is grepping the source for retired names and grepping `dist/assets/*.css` for
the new ones.

```css
@theme {
  /* Surfaces. The page ground is TINTED and controls are white, which is the
     inversion the reference study forced in sketch 012. Judge steps between
     near-white surfaces by dL*, not contrast ratio: ratio squeezes every such
     pair into 1.0 to 1.2 and hides real differences. */
  --color-bg:           #f0f2f0;   /* page ground, dL* 4.7 from white */
  --color-surface:      #ffffff;   /* cards, fields on the ground */
  --color-sunken:       #e7ece7;   /* the tinted fill INSIDE a white card */
  --color-desk:         #e2e8e2;   /* >=640px, behind the sheet (the sheet
                                      itself takes bg, not surface) */

  --color-ink:          #12140f;   /* 16.5:1 on bg */
  --color-dim:          #5b6360;   /* 5.5:1 on bg, all secondary text */

  --color-line:         #e3e8e3;   /* decorative rules ONLY */
  --color-line-strong:  #7f887f;   /* anything BOUNDING a control (1.4.11) */

  --color-accent:       #0a6b42;
  --color-accent-hover: #0c7a4c;
  --color-accent-wash:  #dce9e1;
  --color-mint:         #3ddc91;   /* fills on the band only, never text */

  --color-down:         #be3623;   /* 5.0:1 on bg */
  --color-down-wash:    #f7dfdb;
  --color-notice:       #7a5e12;   /* 5.4:1 on bg */
  --color-notice-wash:  #f4ebd3;

  --color-band:         #123322;   /* landing proof band + GroupPage header */
  --color-band-dim:     #a9bbae;   /* 6.8:1 on band; the ONLY control
                                      boundary colour on the band */

  --color-focus:        #12140f;   /* deliberately NOT accent */
  --color-scrim:        color-mix(in srgb, #12140f 45%, transparent);

  --font-sans: "Geist", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;

  --text-display: 2rem;        --text-title:      1.375rem;
  --text-section: 1.125rem;    --text-body:       1rem;
  --text-row-amount: 1rem;     --text-hero-balance: 1.75rem;
  --text-label:   0.875rem;    --text-micro:      0.8125rem;

  --radius-card:  14px;
  --radius-inner: 10px;

  --shadow-sheet / --shadow-dialog / --shadow-float / --shadow-press
}
```

All font sizes are `rem`, never `px`, so mobile OS text-size settings and 200%
browser zoom reflow correctly.

**No tokens for control heights, icon sizes or z-index.** `--spacing` already
generates `h-13` (52px) and `size-4.5` (18px), and Tailwind v4 has no
`--z-index-*` namespace, so the four z-index literals stay in place with the
ladder documented in `styles.css`.

Geist Mono is tabular by construction, so `tabular-nums` is redundant wherever
`font-mono` is set. It stays on the money `<input>`s, which are sans.
