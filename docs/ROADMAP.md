# Roadmap — Phases → Sprints → Tasks

**Status:** Draft v1
**Owner:** Hemanta
**Companion docs:** PRD.md, TECH_STACK.md, APP_FLOW.md, DESIGN_SYSTEM.md
**Last updated:** 2026-08-23

Task IDs follow `P.S.T` (phase.sprint.task) — reference them in commits/branches (`feat: 1.3.2 balance computation`) so a bug can be traced straight back to the task that introduced it. This is a living plan — reorder or split tasks as you go, the structure is for traceability, not a contract.

---

## Phase 0 — Planning (complete)
- [x] PRD.md
- [x] TECH_STACK.md
- [x] APP_FLOW.md
- [x] DESIGN_SYSTEM.md

---

## Phase 1 — Backend Core (no UI yet)
**Done when:** every endpoint below works correctly via curl/Postman/tests — the hardest logic (splits, balances, redistribution) is proven before any screen exists.

### Sprint 1.1 — Project Setup
- [ ] 1.1.1 Repo structure (e.g. `/apps/web`, `/apps/api`), Express + TypeScript skeleton, health-check route
- [ ] 1.1.2 Railway: provision Postgres, connect backend via env var
- [ ] 1.1.3 Prisma init, write `schema.prisma` per TECH_STACK.md §3 (including `ActivityLog`, `Expense.idempotencyKey`, and the indexes on `ExpenseSplit.expenseId/personId` + `Settlement.groupId`), run first migration
- [ ] 1.1.4 Vite + React + TypeScript skeleton, first deploy to Vercel (confirm the pipeline works before building anything real)
- [ ] 1.1.5 Vitest set up on both `/apps/web` and `/apps/api`; GitHub Actions CI running lint + typecheck + test on push (dev council: plan review)

### Sprint 1.2 — Group & Person API
- [ ] 1.2.1 `POST /groups` — create group, generate join code, name/label
- [ ] 1.2.2 `GET /groups/:code` — resolve group by join code, "not found" handling
- [ ] 1.2.3 `POST /groups/:code/people` — add person; enforce 20-member cap
- [ ] 1.2.4 `PATCH /people/:id` — soft-delete (remove); block if they're a payer on any expense
- [ ] 1.2.5 Per-IP rate limiting on `POST /groups` and `POST /groups/:code/people` (TECH_STACK.md §5, dev council: plan review)

### Sprint 1.3 — Expense & Split API
- [ ] 1.3.1 `POST /groups/:code/expenses` — split resolution (equal/percent/custom → always resolved to dollar `ExpenseSplit` rows); server-side rejects with 400 if resolved splits don't sum to `Expense.amount` (TECH_STACK.md §3, dev council: plan review); dedupes on `Idempotency-Key` to prevent double-submit
- [ ] 1.3.1b Per-IP rate limiting on this endpoint too (same as 1.2.5)
- [ ] 1.3.2 Balance computation (derive pairwise balances from `ExpenseSplit` − `Settlement`) — unit-test this in isolation, it's the core of the app
- [ ] 1.3.3 `PATCH /expenses/:id` — edit, including payer reassignment; same server-side split-sum validation as 1.3.1
- [ ] 1.3.4 `DELETE /expenses/:id`
- [ ] 1.3.5 Member-removal redistribution logic (PRD §6.2: equal/percent/custom rules) — unit-test each split-method case separately, including penny-remainder rounding (TECH_STACK.md §3)
- [ ] 1.3.6 `ActivityLog` writes on every mutation endpoint (TECH_STACK.md §3) — wire into 1.2.3/1.2.4/1.3.1/1.3.3/1.3.4/1.3.5/1.4.1

### Sprint 1.4 — Settlement API
- [ ] 1.4.1 `POST /groups/:code/settlements` — record settlement with note
- [ ] 1.4.2 Confirm balances recompute correctly after a settlement

---

## Phase 2 — Frontend Shell (wired to the real API, no real-time yet)
**Done when:** you can actually use the app end-to-end with a friend, manually refreshing to see their changes.

### Sprint 2.1 — App Shell
- [ ] 2.1.1 Routing: `/`, `/create`, `/join`, `/g/[code]`
- [ ] 2.1.2 API client (fetch wrapper or React Query setup)
- [ ] 2.1.3 Bare-bones layout — functional only, no design system yet

### Sprint 2.2 — Entry Flows (App Flow §2.1–2.4)
- [ ] 2.2.1 Homepage: three entry actions
- [ ] 2.2.2 Create Group flow + "add people" step
- [ ] 2.2.3 Quick 1:1 flow
- [ ] 2.2.4 Join flow (link resolution + manual code entry + "not found" state)

### Sprint 2.3 — Group View & Core Interactions (App Flow §2.5–2.9)
- [ ] 2.3.1 Group View: member list, expense list, balance summary
- [ ] 2.3.2 Add/Edit Expense modal — all 3 split methods, sum validation
- [ ] 2.3.3 Add/Remove Person, including the payer-reassignment block UI
- [ ] 2.3.4 Settle Up modal
- [ ] 2.3.5 "Who are you" identification + local storage (per-group, skippable)

---

## Phase 3 — Real-Time Sync
**Done when:** two devices in the same group see each other's changes without refreshing.

### Sprint 3.1 — Socket.io Backend
- [ ] 3.1.1 Socket.io server on the Express process, room-per-group
- [ ] 3.1.2 Broadcast on every mutation (expense CRUD, person add/remove, settlement)

### Sprint 3.2 — Socket.io Frontend
- [ ] 3.2.1 Client connects and joins the group's room on Group View mount
- [ ] 3.2.2 Incoming events update local state/cache live
- [ ] 3.2.3 Reconnect handling: refetch group state via REST on socket reconnect (TECH_STACK.md §4)
- [ ] 3.2.4 Update-pulse visual cue on a row that just changed (Design System §6)

---

## Phase 4 — Design System Application + PWA
**Done when:** the app looks and feels like DESIGN_SYSTEM.md, on mobile and desktop, and is installable.

### Sprint 4.1 — Tokens & Base Components
- [ ] 4.1.1 Tailwind config: ledger palette + Fraunces/Plex Sans/Plex Mono (DESIGN_SYSTEM.md §11)
- [ ] 4.1.2 Base components: buttons, member chip, expense row, balance row

### Sprint 4.2 — Apply Across Screens
- [ ] 4.2.1 Restyle every Phase 2 screen with the approved design system
- [ ] 4.2.2 Static "Settled" badge, no animation (MVP scope — confirmed). Animated stamp (Design System §5) deferred to a later polish pass, not part of this sprint.

### Sprint 4.3 — PWA & Responsive
- [ ] 4.3.1 `manifest.json` + service worker (installable)
- [ ] 4.3.2 Mobile-first responsive pass across all screens
- [ ] 4.3.3 Accessibility pass: focus rings, reduced motion, contrast

---

## Phase 5 — Deploy & Ship
**Done when:** it's live, and you and your circle are actually using it instead of Splitwise.

### Sprint 5.1 — Hardening
- [ ] 5.1.1 Edge-case validation pass (App Flow §4 table)
- [ ] 5.1.2 Empty-state and error copy pass (Design System §8 voice)

### Sprint 5.2 — Launch
- [ ] 5.2.1 Production env vars, CORS config, final Vercel + Railway deploy
- [ ] 5.2.2 Smoke test end-to-end with a real group
- [ ] 5.2.3 Share with your circle, gather initial feedback

---

## Deferred (post-MVP, per PRD §7)

1. Email magic-link identity / "My Groups" dashboard — **priority for the first post-MVP addition** (per PRD)
2. Debt simplification
3. Consolidated cross-group balance view
4. Notifications
5. Recurring expenses, receipt photos, multi-currency, export, payment integration, sub-categories, split-by-shares
