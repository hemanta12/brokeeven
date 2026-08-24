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
- No accounts, no login, no email required.
- Every group gets a system-generated join code at creation (see Tech Stack doc §2). Anyone with the code can view and add to that group, from any device.
- The group and its full expense history live on the server — clearing a browser's cache does **not** delete or lock anyone out of a group, as long as the join code is still known (e.g. saved in a text thread).
- What cache-clearing *does* lose: the browser's local shortcut list of "groups I've recently opened," and any memory of "which member name is me" in a given group — both are one extra click to restore (re-enter the code, pick your name), not data loss.
- **Permissions are fully flat — confirmed.** Anyone with the join code has the same power as the group's creator: add/edit/delete any expense, remove any person, reassign any payer. No per-editor restrictions (e.g. "only the logger can delete their expense") — that would require tracking identity more reliably than the no-accounts model supports. To keep this accountable, every mutation is recorded to an append-only activity log (see TECH_STACK.md §3 `ActivityLog`) so "what happened and who did it" stays traceable even without accounts.

### 6.6 Platform
- Responsive web app, installable as a PWA (optional — not required to use the app).
- No native mobile app.
- **Real-time sync is required**: if two people are active in the same group at once, additions/edits reflect for both without a manual refresh.

## 7. Out of Scope for MVP (Deferred)

| Feature | Why deferred |
|---|---|
| Email magic-link identity + "My Groups" dashboard | Solves cross-device/cache-clear persistence; explicitly pushed to a fast-follow |
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

**Priority for first post-MVP addition:** email magic-link identity ("My Groups" dashboard) — confirmed as the next feature to build once MVP is running end-to-end, before any of the other deferred items above.

## 8. Constraints & Known Limitations

- **Hosting:** Vercel (frontend) + Railway (backend/DB as needed). Free tier, low-traffic assumption.
- **Currency:** USD only.
- **Group size cap:** 20 members per group, enforced.
- **Groups-per-session cap:** 20 groups tracked per browser (via local storage), enforced. This is a per-browser-session cap, not a true per-person cap — since MVP has no login, "session" and "person" are treated as equivalent by design. The same person on a different browser or device gets a separate session with its own 20-group allowance; this is expected, not a bug. This is a local-storage list limit, not a server-side limit — creating/joining a 21st group still works normally; the oldest entry is silently evicted from the local shortcut list (LRU), no warning shown.
- **Cache clearing** loses only the browser's local shortcut list and "which name is me" memory — not the group or its history, which live server-side and stay reachable via the join code (see §6.5).

## 9. Naming

**Name: BrokeEven.** Checked against existing bill-splitting apps — this naming space is extremely saturated (Even, Steven, Square, Tally, Ledger, and nearly every "split-" compound are all already in use by small existing apps), but BrokeEven cleared with no collisions found. Plays on "broke" (splitting bills implies money's tight) and "break even" (settling up) — the name carries the product's actual sense of humor about the situation, not just a literal description of the feature.

## 10. Proposed Success Criteria (draft — adjust freely)

- Everyone currently using Splitwise/alternatives in your circle switches to this within a few weeks of launch.
- Zero "it's missing X so we worked around it" complaints — the exact problem this project exists to fix.
- Live, deployed, and linkable from your resume/portfolio.
