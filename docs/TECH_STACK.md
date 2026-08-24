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
- **Permissions inside a group are fully flat, by design (confirmed)** — anyone with the code has the same power as the creator, including deleting others' expenses or removing people. No per-editor restriction, since there's no reliable identity to restrict by. To keep this accountable without adding accounts, every mutation is written to an append-only `ActivityLog` (see §3) — action type, actor name if one was set via "Who are you?", timestamp. Not a permission system, just a trail.
- This mechanism doesn't get replaced later. When the deferred email magic-link feature ships, it solves a *different* problem (finding groups you're already a named member of, from a new device) — it doesn't change how a group is created or joined in the first place.

## 3. Data Model

### `Group`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | string | User-facing name, e.g. "Home", "Cancun Trip" |
| label | string, nullable | Free-text org label (Home/Trip/Individual/etc.) — cosmetic only, no behavior tied to it |
| joinCode | string, unique | See §2 |
| createdAt | timestamp | |

### `Person`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| groupId | uuid (FK → Group) | People are scoped per group, no cross-group identity in MVP |
| name | string | |
| email | string, nullable | **Unused in MVP** — reserved now so the deferred magic-link feature doesn't require a schema migration later |
| removedAt | timestamp, nullable | **Soft delete.** Removing someone sets this instead of deleting the row, so historical expenses/splits that reference them stay intact. A non-null `removedAt` hides them from "current members" and blocks adding them to new expenses. |
| createdAt | timestamp | |

### `Expense`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| groupId | uuid (FK → Group) | |
| description | string | |
| amount | decimal | USD only |
| date | date | |
| payerId | uuid (FK → Person) | Freely reassignable via edit; removal of a payer is blocked until reassigned (per PRD §6.2) |
| splitMethod | enum (`equal`, `percent`, `custom`) | Kept for display/edit purposes — see `ExpenseSplit` for how it's actually resolved |
| idempotencyKey | string, nullable, unique | Client-generated per submit attempt (see below); a repeat POST with the same key returns the original expense instead of creating a duplicate |
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
| settledAt | timestamp | |

**Balances are never stored** — they're computed on read from `ExpenseSplit` (what each person owes) minus `Settlement` (what's already been paid) between each pair of people in a group. This keeps the data an append-only ledger, the same principle real accounting systems use, and means there's no running-total field that can ever drift out of sync with reality.

### `ActivityLog`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| groupId | uuid (FK → Group) | |
| action | enum (`expense_add`, `expense_edit`, `expense_delete`, `person_add`, `person_remove`, `settlement`) | |
| actorName | string, nullable | The acting browser's "who am I" name if set (App Flow §2.5); null if that browser skipped identification |
| detail | text, nullable | Short human-readable summary, e.g. "deleted 'Groceries' ($42.10)" |
| createdAt | timestamp | |

Write-only audit trail for the flat-permissions model (§2) — not read for balance computation, just surfaced as a "recent activity" list so it's clear who did what. Every mutation endpoint writes one row here alongside its normal write.

## 4. Real-Time Sync

- Socket.io server runs inside the same Express process on Railway.
- One "room" per `Group.id`. On loading a group (via join code), the client joins that room.
- Any mutation (add/edit/delete expense, add/remove person, settle up) writes to Postgres first, then broadcasts the updated state to everyone in that room.
- No polling needed; clients just listen for room events.
- **Reconnect behavior (confirmed):** on socket reconnect (phone locks, wifi blip), the client refetches the group's full current state via the existing REST `GET /groups/:code`, then resumes listening for live events. No event-sequencing/replay logic — simplest correct fix, and group payloads are small enough that a full refetch is cheap.

## 5. Deployment Notes

- Frontend: Vercel, auto-deploy from main branch.
- Backend: Railway, single service running the persistent Express + Socket.io process.
- Database: Railway-managed Postgres, same project as backend for simplicity.
- Environment variables (DB connection string, CORS origin, etc.) managed per-platform; no secrets committed to the repo. Frontend build-time vars use Vite's `VITE_` prefix (e.g. `VITE_API_URL`), declared in `vite-env.d.ts` for type safety — not Next's `NEXT_PUBLIC_` convention.
- **CORS (confirmed):** allow the production Vercel domain plus a pattern for this project's Vercel preview URLs (`*.vercel.app` scoped to the project, not a global wildcard) — lets preview deploys work without opening CORS to arbitrary origins.
- **Rate limiting (confirmed):** basic per-IP throttling (`express-rate-limit` or equivalent) on `POST /groups`, `POST /groups/:code/people`, and `POST /groups/:code/expenses` — these are unauthenticated write endpoints on a public URL. A few lines, closes off casual spam.
- **Error tracking:** deferred to post-MVP. `ActivityLog` (§3) already covers app-level audit trail; exception/crash tracking (e.g. Sentry) can be added once the app is live and there's real traffic to watch.
