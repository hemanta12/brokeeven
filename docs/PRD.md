# BrokeEven — Product Requirements Document

**Status:** Draft v1
**Owner:** Hemanta
**Last updated:** 2026-08-23

---

## 1. Overview

A free, minimal expense-splitting web app for a known circle of friends/housemates. It replicates the specific Splitwise workflow Hemanta actually relies on — categorized groups, flexible people management, and flexible expense splitting — without the paywall, and without the missing-feature compromises of other free alternatives. Also intended as a portfolio piece.

## 2. Problem Statement

Splitwise moved its most-used features behind a paywall. The free alternatives tried so far each miss at least one core feature (organizing expenses by group/category, freely adding/removing people, or flexible splitting), which makes them impractical day-to-day substitutes. This app is a lean, purpose-built replacement for exactly the workflow that's missing — nothing more.

## 3. Goals

- Recreate the three Splitwise behaviors used daily: categorized groups, flexible people management, flexible splitting.
- Zero friction to start — no signup wall, no install required.
- Real-time shared view of a group's expenses and balances.
- Runs for free (Vercel + Railway) at low, predictable traffic.
- Presentable as a portfolio/resume project.

## 4. Target Users

Hemanta and a known circle of friends/housemates. Public-facing, but not designed for or expecting organic/public traffic.

## 5. Core User Stories

- As a user, I can create a group (e.g., "Home", "Cancun Trip", or a 1:1 split) without signing up.
- As a user, I can add or remove people from a group at any time, by name only.
- As a user, I can log an expense, choose who paid, and split it equally, by percentage, or by custom dollar amounts among any subset of members.
- As a user, I can see running balances (who owes whom) within a group, live, as others make changes.
- As a user, I can mark a balance as settled and note how it was paid.

## 6. Feature Specification (MVP)

### 6.1 Groups
- Create unlimited groups per browser session.
- A group is a name + a flat list of members + a flat list of expenses. No sub-categories.
- The group "type" (Home / Trip / Individual, etc.) is a free-text label for the user's own organization only — it does not change app behavior.
- Hard cap: **20 members per group**.
- Balances are shown **per group only** — no consolidated cross-group balance view in MVP.

### 6.2 People
- Add or remove people from a group at any time, identified by **name only** (no accounts, no email required).
- People are scoped **per group** — the same friend added to two groups is two independent entries; there is no shared identity between groups in MVP.
- **Removing a person — business rules (confirmed):**
  - If the person is the **payer** on any existing expense, block removal and prompt to reassign that expense's payer first.
  - Once removed, their share of every remaining expense they were split into is automatically redistributed among the remaining split participants, using the original split method:
    - Equal split → divide by one fewer person.
    - Percentage split → remaining percentages renormalize to 100%.
    - Custom dollar split → the removed person's amount is redistributed proportionally across the remaining split members.

### 6.3 Expenses
- Fields: description, amount (USD only), date, payer (single person; **easily reassignable** after the fact), split method, split participants.
- Split methods: **equal / percentage / custom dollar amount**. No split-by-shares.
- Expense notes are out of scope for MVP; the required description is the only expense text field.
- Edit or delete an expense at any time.
- No receipt/photo attachments, no recurring expenses, no multi-currency in MVP.

### 6.4 Balances & Settling
- Real-time, per-group balance view (who owes whom).
- "Mark as settled" between two people for a given balance, with a required free-text note of how (e.g., "Venmo", "cash").
- No debt-simplification algorithm in MVP — balances shown as raw pairwise amounts, not minimized.
- No payment integration — settling is record-keeping only; no money moves through the app.

### 6.5 Access Model
- **No account required.** Creating a group, joining by code, and adding expenses all work with no sign-in, exactly as before.
- **Optional Google sign-in** (added 2026-08-30) buys two things and nothing else: your groups listed on one screen across devices, and your entries staying editable if this browser forgets you. It never gates joining or creating a group.
- Every group gets a system-generated join code at creation (see Tech Stack doc §2). Anyone with the code can view and add to that group, from any device.
- The group and its full expense history live on the server — clearing a browser's cache does **not** delete or lock anyone out of a group, as long as the join code is still known (e.g. saved in a text thread).
- What cache-clearing *does* lose: the browser's local shortcut list of "groups I've recently opened," and any memory of "which member name is me" in a given group — both are one extra click to restore (re-enter the code, pick your name), not data loss.
- **Permissions are creator-owned. Superseded 2026-08-30** — this section previously specified fully flat permissions, on the grounds that per-editor restrictions "would require tracking identity more reliably than the no-accounts model supports." A real session cookie now does track it reliably, so that objection no longer holds.
  - **You may edit or delete only the expenses and settlements you created.** Everyone else's are read-only to you; the UI hides the affordance rather than showing a button that 403s.
  - **Adding is still open to anyone with the code**, as is viewing. Only editing *existing* rows is restricted.
  - **Rows created before this change have no recorded creator and stay editable by anyone**, so no existing data is stranded.
  - **People are not creator-owned.** Renaming and removing a member stay open to any group member — removing someone who has left is a group-admin action nobody else can perform.
  - Ownership is recorded against the *account or guest session*, not the `Person` row, so it survives a rename or a removal and works across groups.
  - Every mutation is still recorded to an append-only activity log (TECH_STACK.md §3 `ActivityLog`), which now finally carries `actorName` for anyone who has said who they are.

### 6.6 Platform
- Responsive web app, installable as a PWA (optional — not required to use the app).
- No native mobile app.
- **Real-time sync is required**: if two people are active in the same group at once, additions/edits reflect for both without a manual refresh.

## 7. Out of Scope for MVP (Deferred)

| Feature | Why deferred |
|---|---|
| ~~Email magic-link identity + "My Groups" dashboard~~ | **Shipped 2026-08-30 as Google sign-in instead** — same problem (cross-device persistence), one fewer auth path to maintain and no mail delivery to operate. |
| Debt simplification (minimize # of settle-up transactions) | Nice-to-have, not core to daily use |
| Consolidated cross-group balance view | Per-group is enough for now |
| Notifications (new expense, added to group, unsettled reminders) | Adds complexity, not needed at this scale |
| Recurring expenses | Not part of current workflow |
| Receipt photo attachments | Not part of current workflow |
| Multi-currency support | Single-currency use case only |
| Data export (CSV/PDF) | Not needed yet |
| Payment integration (Venmo/PayPal/Zelle) | Record-keeping only, by design |
| Sub-categories within a group | Flat list is sufficient |
| Split-by-shares | Not part of current workflow |

**Priority for first post-MVP addition:** ~~email magic-link identity~~ — **done 2026-08-30**, delivered as optional Google sign-in with a "My Groups" screen. Magic-link auth is dropped rather than deferred: it solved the same problem, and shipping both would mean two auth paths for one need.

## 8. Constraints & Known Limitations

- **Hosting:** Vercel (frontend) + Railway (backend/DB as needed). Free tier, low-traffic assumption.
- **Currency:** USD only. *(MVP limitation. Superseded by §11 — Sprint 6.1 adds a per-group base currency. Per-expense currency and rate conversion remain out of scope.)*
- **Group size cap:** 20 members per group, enforced.
- **Groups-per-session cap:** 20 groups tracked per browser (via local storage). *Never implemented, and now partly moot: signed-in users get a server-side "My Groups" list with no such cap.* For anonymous users the local list is still per-browser rather than per-person. The same person on a different browser or device gets a separate session with its own 20-group allowance; this is expected, not a bug. This is a local-storage list limit, not a server-side limit — creating/joining a 21st group still works normally; the oldest entry is silently evicted from the local shortcut list (LRU), no warning shown.
- **Cache clearing** loses only the browser's local shortcut list and "which name is me" memory — not the group or its history, which live server-side and stay reachable via the join code (see §6.5).

## 9. Naming

**Name: BrokeEven.** Checked against existing bill-splitting apps — this naming space is extremely saturated (Even, Steven, Square, Tally, Ledger, and nearly every "split-" compound are all already in use by small existing apps), but BrokeEven cleared with no collisions found. Plays on "broke" (splitting bills implies money's tight) and "break even" (settling up) — the name carries the product's actual sense of humor about the situation, not just a literal description of the feature.

## 10. Proposed Success Criteria (draft — adjust freely)

- Everyone currently using Splitwise/alternatives in your circle switches to this within a few weeks of launch.
- Zero "it's missing X so we worked around it" complaints — the exact problem this project exists to fix.
- Live, deployed, and linkable from your resume/portfolio.

---

## 11. Post-MVP Scope — Differentiation (added 2026-08-25)

**§6 and §7 above describe the MVP and are left intact as the historical record.** This section supplements them; where the two conflict, this section governs from 2026-08-25 onward.

### Why

The MVP is feature-complete but has no reason-to-exist next to Splitwise beyond being free. Two research passes were commissioned (`Features-Research.md` = V1, `Features-Research-2.md` = V2) to find evidence-backed gaps. They contradict each other on most findings; **V2 governs** — it cites named, dated primary sources from Splitwise's own feedback forum and separates primary evidence from news-aggregator paraphrase, while V1's quote tables have no source links. Rationale recorded in `decision-log.md`, 2026-08-25.

**Rejected on evidence** — do not revisit without new data:

| Idea | Why rejected |
|---|---|
| "Whose turn to pay next" | Already shipped by Splitwise, WhoPays, and Split.rest. Commoditized |
| Non-cash contribution credit (driving, cooking, hosting) | No user demand found. V1 mistook road-trip gas-etiquette arguments for demand for software. A founder hypothesis, not a need |
| Multi-currency conversion | Splid and Tricount already do it free and offline. Table stakes, not differentiation, and an external rate API would break the PWA offline story |

### What this adds to §6

- **§6.3 Expenses** — the split methods were to become **equal / percentage / custom dollar amount / weighted**. **Weighted was dropped on 2026-09-06** and deferred back to post-MVP, so the shipped set stays equal / percentage / custom; the paragraph below is kept as the plan of record if it returns. Its value is *persistence*: `Person.weight` lives on the person and `Group.defaultSplitMethod` on the group, so a group configures its ratio once instead of re-entering it per expense. It is deliberately a named method rather than a redefinition of "equal" — a UI that says "equal" while producing unequal numbers is a lie, and this is a money app. Amount stays single-currency **per group**, no longer USD-hardcoded.
- **§6.4 Balances & Settling** — adds **closing a ledger**: a group-level forgiveness threshold, a one-tap close that forgives sub-threshold balances and presents a minimum-transaction settle-up, and a reversible closed state. Forgiven balances are materialized as `Settlement` rows, so **the record is preserved and nothing is deleted**.
  - "No debt-simplification algorithm" in §6.4 **still holds for the Balances tab**, which continues to show raw pairwise amounts. Simplification happens *only* inside the close-out view.
  - "No payment integration" in §6.4 **is unchanged**. Sprint 6.4 adds a per-person payment *handle* — free text, surfaced at settle time with copy and a QR. No money moves through the app; it remains record-keeping.
  - Closing is reversible by anyone with the join code, consistent with §6.5's flat permissions and the activity log as the accountability substitute.

### What this changes in §7

| §7 deferred row | New status |
|---|---|
| Debt simplification | Partially promoted — close-out only |
| Multi-currency support | Partially promoted — per-group base currency only; per-expense currency and conversion stay deferred |
| Split-by-shares | Promoted as `weighted`, then **dropped 2026-09-06** and deferred again (decision-log 2026-09-06) |
| Payment integration | **Unchanged — still out of scope.** A handle is not an integration |
| Recurring expenses | Still deferred, but it was the best-evidenced finding not picked up (Spliit GitHub #114, 27 👍). Held back as an audience call — it serves roommates, not travelers. Revisit if household use dominates |

**Superseded priority:** §7 names email magic-link identity as "priority for first post-MVP addition." That ordering is superseded — the above precedes it. Magic-link identity remains the next item after.

### Sequencing

Phase 5 gets the MVP deployed and smoke-tested. Phase 6 builds the differentiation. Phase 7 puts it in front of people — and is deliberately gated: Sprint 7.1 (real usage with a known circle) must precede Sprint 7.2 (public launch), because the story `MARKETING.md` tells is the close-the-ledger story, and a launch post landing while the app has never been used burns its one shot.

An earlier draft wedged this work between hardening and launch, which would have shipped four features before any real user touched the app — inverting V2's own recommendation that usage data should gate the close-out investment. The phase split resolves that: the app is live from Phase 5, and 7.1 provides the usage signal before anything goes wide. Watch specifically whether anyone closes a trip or uses the simplified settle mode; with weighted splits dropped, those are the bet, and if nobody touches them the differentiation didn't land.

Tasks: `ROADMAP.md` Phase 6 (Sprints 6.1–6.5). Launch and feedback: Phase 7. Launch angle: `MARKETING.md`.
