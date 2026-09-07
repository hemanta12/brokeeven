# Tech Stack & Data Model

**Status:** Draft v1
**Owner:** Hemanta
**Companion doc:** PRD.md
**Last updated:** 2026-08-23

---

## 1. Architecture Overview

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vite + React (TypeScript) | No SSR/SEO need — this is a join-code-gated utility, not a page that has to rank. Lighter, faster dev loop than Next.js for what's fundamentally a real-time SPA. Matches the existing React & Vite coding conventions already in use. |
| Routing | React Router | Client-side routes for `/`, `/join`, `/g/:code` (§2). |
| PWA | `vite-plugin-pwa` | Installable-PWA requirement (PRD §6.6) — Next.js would've had this built in; Vite needs the plugin explicitly. |
| Frontend hosting | Vercel | Already decided; free tier fits low-traffic use. Vercel serves a Vite build as a static SPA the same way it does any static site. |
| Backend | Node.js + Express (TypeScript) | Must run as a **persistent process**, not serverless functions — required for WebSocket connections (see §4). This is *why* the Vercel/Railway split makes sense architecturally, not just for cost. |
| Backend hosting | Railway | Already decided; supports long-running processes + managed Postgres. |
| Database | PostgreSQL (Railway) | Data is genuinely relational — groups, people, expenses, splits, and settlements all reference each other. |
| ORM | Prisma | Strong TypeScript fit; schema doubles as readable documentation. |
| Real-time | Socket.io | Well-trodden, handles reconnects gracefully, supports "rooms" (one per group). |
| Styling | Tailwind CSS | Fast to build with; feeds directly into the Design System doc next. |

**Request flow:** Browser (Vite/React SPA) → REST API for reads/writes → Express + Prisma → Postgres. In parallel, browser opens a WebSocket to the same backend and joins a room for its current group; any write broadcasts the updated state to everyone in that room.

## 2. Access & Identity Model

**Mechanism: shareable invite link, backed by a join code.**

- Creating a group generates a short, unique code (e.g. `CANCUN-4821`, 8 characters, uppercase alphanumeric, excluding visually ambiguous characters like `0/O`, `1/I/L`). This code is the underlying identifier — nobody needs to remember or type it in the normal flow.
- **Default, primary action:** after creating a group, a one-tap "Share invite link" button copies/shares a URL like `/g/CANCUN-4821`. Whoever receives it taps it and lands directly in the group — no typing, no memorizing, no separate sign-in.
- A manual "Join a group" code-entry form still exists on the homepage as a **fallback** — for the rare case someone is told the code out loud, or a link doesn't render as clickable text.
- This is **not** the "secret personal link = your login" pattern ruled out earlier. The link doesn't identify a person or grant any access beyond what the code already grants — it's a delivery mechanism for the code, not an authentication credential. That's why it doesn't reopen the decision against accounts/email for MVP.
- This is obscurity-level protection, not cryptographic security — appropriate for the stated scale (known circle, low traffic), not for anything more sensitive than a personal expense split.
- **Permissions are creator-owned as of 2026-08-30.** This bullet previously read "fully flat, by design... since there's no reliable identity to restrict by." There now is one, so: you may edit or delete only the expenses and settlements *you* created. Adding and viewing stay open to anyone with the code, and rows with no recorded creator (everything from before this change) stay editable by anyone. Renaming/removing people stays open to all — removing a departed member is an action nobody else can take. The append-only `ActivityLog` (§3) remains, and now actually carries `actorName`.
- **Sessions.** Every actor — signed in or not — is one `User` row plus one HMAC-signed `httpOnly` cookie (`be_session`, via `cookie-parser`, no JWT library). A guest is a `User` with `googleSub = null`. There is no `Session` table and no refresh token: the cookie carries a user id, and promotion preserves that id, so nothing is invalidated by signing in.
- **Optional Google sign-in.** The button is the app's own (`SignInButton.tsx`), not Google's rendered one — Google's brand rules mean a `renderButton` iframe can never fully match the app's own controls, and it pops in asynchronously once its own script loads. The custom button instead opens Google's OAuth popup directly (`google.accounts.oauth2.initCodeClient`, `ux_mode: 'popup'`), which returns a one-time authorization code to the page. `POST /auth/google` exchanges that code server-side (`OAuth2Client.getToken({ code, redirect_uri: 'postmessage' })`, which needs `GOOGLE_CLIENT_SECRET` alongside `GOOGLE_CLIENT_ID`) and verifies the `id_token` the exchange returns with `google-auth-library`, same as before. No redirect URI or state parameter to register — `postmessage` is a literal value Google recognizes for this popup case, not a real URI. Signing in **promotes the guest row in place**, so everything created anonymously keeps its owner id with no data migration. If that Google account already has a row (an earlier sign-in on another device), the guest is merged into it and deleted.
- **CSRF.** Without `COOKIE_DOMAIN`, the session is `SameSite=None` and therefore sent cross-site. Two things close it: `WEB_ORIGIN` is a required explicit allowlist in production (credentialed CORS must never reflect an arbitrary origin), and writes must be `application/json` — a cross-site `<form>` cannot produce that, and anything that can must clear a preflight the allowlist blocks. No token store needed.
- **Known ceiling:** with no `COOKIE_DOMAIN`, Safari/Brave may cap the third-party cookie to ~7 days. A guest who loses it *before ever signing in* loses edit rights on their older entries. Accepted deliberately — it is the reason to sign in, and setting `COOKIE_DOMAIN` to a shared parent domain makes the cookie first-party `SameSite=Lax` and removes it entirely.
- This mechanism doesn't get replaced. Sign-in solves a *different* problem (finding groups you're already a named member of, from a new device); it doesn't change how a group is created or joined.

## 3. Data Model

### `User`
Added 2026-08-30. One row per actor, signed in or not.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | The owner id stamped on expenses and settlements |
| googleSub | string, unique, nullable | Google's stable subject id. **Null means this is a guest** — the same table serves both, which is what lets sign-in promote a row in place rather than migrate data |
| email / name / avatarUrl | string, nullable | From the verified Google ID token. All null for a guest |
| createdAt / lastSeenAt | timestamp | |

### `Group`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | string | User-facing name, e.g. "Home", "Cancun Trip" |
| label | string, nullable | Free-text org label (Home/Trip/Individual/etc.) — cosmetic only, no behavior tied to it |
| joinCode | string, unique | See §2 |
| currency | string, default `"USD"` | ISO 4217, validated against a 10-code allowlist (USD/EUR/GBP/CAD/AUD/JPY/INR/NPR/SGD/AED). **Display-only** — amounts are stored as plain decimals and balances derive from them, so changing it relabels figures and recomputes nothing. Editable after creation via `PATCH /groups/:code/currency` (Sprint 6.1) |
| closedAt | timestamp, nullable | Non-null = the ledger is closed. A closed group is **fully read-only**: every ledger write 409s (§3, close-out rules below). Cleared by `POST /groups/:code/reopen`, which clears this column and nothing else (Sprint 6.3) |
| forgiveThreshold | decimal, default 0 | The per-balance write-off cut-off chosen at close time, persisted so the closed group can explain itself later |
| settleMode | enum (`direct`, `simplified`), default `direct` | Group-level choice of which set of payments `Settle Up` writes against — raw pairwise, or the minimized plan. Group-level, not per-device, so two people can never follow two different instruction sets against the same debt (Sprint 6.3 amendment) |
| createdAt | timestamp | |

### `Person`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| groupId | uuid (FK → Group) | People are scoped per group, no cross-group identity in MVP |
| name | string | |
| paymentHandle | string(100), nullable | Added in Sprint 6.4. Free text — a Venmo/UPI id, a payment link, or a note like "cash only" — shown to whoever is paying this person at settle time. The app never parses or transacts on it; still record-keeping only, per PRD §6.4. Set via its own route `PATCH /people/:id/handle` for the same reason renaming has one: `PATCH /people/:id` **is** the soft-delete, so a body it does not recognise must never be able to mean "edit the person". Not written to `ActivityLog` — a contact detail is not a ledger event |
| userId | uuid (FK → User), nullable | Set when someone identifies as this person via "Who are you?". Unique per `(groupId, userId)`: one account claims at most one person per group. Null = unclaimed, which is every pre-existing row |
| removedAt | timestamp, nullable | **Soft delete.** Removing someone sets this instead of deleting the row, so historical expenses/splits that reference them stay intact. A non-null `removedAt` hides them from "current members" and blocks adding them to new expenses. |
| createdAt | timestamp | |

### `Expense`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| groupId | uuid (FK → Group) | |
| title | string | Required. The original `description` field, renamed |
| description | string, nullable | Optional free-text notes, added alongside the rename |
| amount | decimal | Denominated in the group's `currency` — a single base currency per group, no per-expense currency and no rate conversion (PRD §11) |
| date | date | |
| payerId | uuid (FK → Person) | Freely reassignable via edit; removal of a payer is blocked until reassigned (per PRD §6.2) |
| splitMethod | enum (`equal`, `percent`, `custom`) | Kept for display/edit purposes — see `ExpenseSplit` for how it's actually resolved |
| idempotencyKey | string, nullable, unique | Client-generated per submit attempt (see below); a repeat POST with the same key returns the original expense instead of creating a duplicate |
| createdByUserId | uuid, nullable | Who may edit this row (§2). Deliberately a plain column, not an FK relation — **null means unowned and editable by anyone**, which is the correct state for every row predating this column, and for a client whose cookie never stuck |
| createdAt / updatedAt | timestamp | |

**Server-side split validation (confirmed, dev council review):** `POST /groups/:code/expenses` and `PATCH /expenses/:id` re-check that resolved `ExpenseSplit` amounts sum to `Expense.amount` (after rounding) **before writing**. Client-side validation (APP_FLOW §4) is a UX nicety, not the enforcement point — a mismatch is rejected with `400` and nothing is written. This is what actually guarantees the `ExpenseSplit` invariant below, not just the rounding rule.

**Idempotency (confirmed):** the client generates an idempotency key per save attempt (e.g. a UUID created when the Add/Edit Expense modal opens) and sends it as `Idempotency-Key` header or body field. The server dedupes on it — a retried/double-tapped submit returns the already-created expense rather than creating a second one. Prevents flaky-network double-posts from corrupting balances.

### `ExpenseSplit`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| expenseId | uuid (FK → Expense) | |
| personId | uuid (FK → Person) | |
| amount | decimal | **Always resolved to a dollar amount at write time**, regardless of split method — equal/percent splits get converted to dollars immediately, so balance math never has to re-derive percentages later |
| percentAtEntry | decimal, nullable | Stored only when `splitMethod = percent`, purely so the UI can show "this was originally 30%" on edit |

**Rounding rule (confirmed):** equal/percent splits rarely divide into whole cents (e.g. $10 ÷ 3). Render every share as currency with exactly two decimal places, round shares to cents, then assign any leftover pennies to the first selected participant in deterministic split order. The payer is selected by default but may be deselected, so residual cents must not depend on payer identity. `ExpenseSplit` rows for an expense must always sum exactly to `Expense.amount`; this rule, plus the server-side validation above, is what guarantees it.

**Indexes (confirmed):** add DB indexes on `ExpenseSplit.expenseId`, `ExpenseSplit.personId`, and `Settlement.groupId` in the initial `schema.prisma` (task 1.1.3) — balance computation queries by these constantly. Cheap to add now, no reason to wait for a slow query.

**Concurrent edits (confirmed, accepted risk):** no optimistic locking / version field on `Expense`. Two people editing the same expense at once is last-write-wins. Acceptable given the small trusted-group scale and that real-time sync already shows others' changes live — not worth a version field and conflict-resolution UI for this app.

**Member-removal redistribution (PRD §6.2):** on removal, the removed person's `ExpenseSplit` rows are deleted and the remaining rows for that expense are recalculated per the original split method (equal: divide by fewer people; percent: remaining percentages renormalize to 100%; custom: redistribute proportionally). The `Person` row itself is soft-deleted, not removed, so the expense's history stays coherent.

### `Settlement`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| groupId | uuid (FK → Group) | |
| fromPersonId | uuid (FK → Person) | |
| toPersonId | uuid (FK → Person) | |
| amount | decimal | |
| note | text | Required — how it was settled (e.g. "Venmo", "cash") |
| createdByUserId | uuid, nullable | Same ownership rule as `Expense` |
| settledAt | timestamp | |

**Balances are never stored** — they're computed on read from `ExpenseSplit` (what each person owes) minus `Settlement` (what's already been paid) between each pair of people in a group. This keeps the data an append-only ledger, the same principle real accounting systems use, and means there's no running-total field that can ever drift out of sync with reality.

**Debt simplification never mutates history (Sprint 6.3).** `apps/api/src/settleUp.ts` holds both simplification functions as pure code over plain types, no Prisma: `forgiveBelow(balances, thresholdCents)` drops balances under the write-off cut-off, and `minimizeTransactions(balances)` nets each person then greedily matches largest creditor to largest debtor (deliberately not a provably minimal solver — that's the documented upgrade path). Both operate on the computed balance list, never on stored rows, so simplification is a *view* of the ledger everywhere except one place: `POST /groups/:code/close` **materializes** each forgiven balance as a real `Settlement` row (`note: 'Forgiven at close-out'`) rather than editing or deleting any expense. That's why reopening cannot un-forgive automatically — a written-off row is indistinguishable in kind from a real cash payment, and the reversal path is the existing per-settlement Undo. The same math is mirrored client-side in `apps/web/src/features/group/settleUp.ts` so the close-out review screen recomputes per keystroke without a round-trip (same pattern as `splitPreview.ts`).

**Close-out invariants (Sprint 6.3).** A group can only be closed when its ledger balances after forgiveness — `POST /groups/:code/close` 409s otherwise, because closing blocks settlements and would otherwise strand live debt with no surface left to clear it. The balance check runs against the *minimized* plan, so a debt cycle that nets to zero and needs no payments is closeable. Every ledger write routes through one of two guards in `apps/api/src/group/groupState.ts` — `resolveGroupForWrite` or `rejectIfGroupClosed`; **any new ledger write must go through one of them.** `POST /people/:id/claim` is the one deliberate exception: identifying yourself is not a ledger mutation.

### `ActivityLog`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| groupId | uuid (FK → Group) | |
| action | enum (`expense_add`, `expense_edit`, `expense_delete`, `person_add`, `person_remove`, `settlement`, `group_edit`, `group_close`, `group_reopen`) | The last three added in Sprint 6.3. `group_edit` covers group-level setting changes (currency, settle mode) |
| actorName | string, nullable | The acting browser's "who am I" name if set (App Flow §2.5); null if that browser skipped identification |
| detail | text, nullable | Short human-readable summary, e.g. "deleted 'Groceries' ($42.10)" |
| createdAt | timestamp | |

Write-only audit trail for the flat-permissions model (§2) — not read for balance computation, just surfaced as a "recent activity" list so it's clear who did what. Every mutation endpoint writes one row here alongside its normal write.

## 4. Real-Time Sync

- Socket.io server runs inside the same Express process on Railway.
- One "room" per `Group.id`. On loading a group (via join code), the client joins that room.
- Any mutation (add/edit/delete expense, add/remove person, settle up, and the group-level currency / settle-mode / close / reopen writes) writes to Postgres first, then broadcasts the updated state to everyone in that room.
- No polling needed; clients just listen for room events.
- **Reconnect behavior (confirmed):** on socket reconnect (phone locks, wifi blip), the client refetches the group's full current state via the existing REST `GET /groups/:code`, then resumes listening for live events. No event-sequencing/replay logic — simplest correct fix, and group payloads are small enough that a full refetch is cheap.

## 5. Deployment Notes

- Frontend: Vercel, auto-deploy from main branch.
- Backend: Railway, single service running the persistent Express + Socket.io process.
- Database: Railway-managed Postgres, same project as backend for simplicity.
- Environment variables (DB connection string, CORS origin, etc.) managed per-platform; no secrets committed to the repo. Frontend build-time vars use Vite's `VITE_` prefix (e.g. `VITE_API_URL`), declared in `vite-env.d.ts` for type safety — not Next's `NEXT_PUBLIC_` convention.
- **CORS (confirmed):** allow the production Vercel domain plus a pattern for this project's Vercel preview URLs (`*.vercel.app` scoped to the project, not a global wildcard) — lets preview deploys work without opening CORS to arbitrary origins.
- **Rate limiting.** `express-rate-limit` on **every** write route (9 of them; four were previously unthrottled). **Keyed on the session, not the IP** — revised 2026-08-30 after a 429 during ordinary onboarding.
  - Per-IP was the wrong key for this app: the people splitting a dinner are on one WiFi, so they share a public IP and eat each other's budget, and behind carrier-grade NAT strangers would too. Every write mints a session, so only a caller's *first* write is IP-keyed; after that each actor has its own budget.
  - The IP fallback still does its original job: a client that drops cookies stays IP-limited and cannot mint unbounded guest `User` rows. This is also why `requireActor` is mounted **after** the limiter on every route — order matters.
  - Ceiling raised 20 → 120 per 15 min. Onboarding is write-heavy (a group plus eight people is nine writes before a single expense), so 20 was hit during the flow it was least acceptable to fail. Sign-in has a separate 30/15min budget so a burst of edits can't lock someone out of signing in.
  - **Known limit:** the store is in-memory, so counters reset on deploy and each instance counts separately. Fine at one instance; needs a shared store if that changes.
- **Error tracking:** deferred to post-MVP. `ActivityLog` (§3) already covers app-level audit trail; exception/crash tracking (e.g. Sentry) can be added once the app is live and there's real traffic to watch.
