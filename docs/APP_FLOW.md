# App Flow

**Status:** Draft v1
**Owner:** Hemanta
**Companion docs:** PRD.md, TECH_STACK.md
**Last updated:** 2026-08-23

---

## 1. High-Level Journey

```
                                  ┌─────────────┐
                                  │  Homepage   │
                                  │ (/)         │
                                  └──────┬──────┘
              ┌───────────────────┬──────┴───────────┬─────────────────┐
              ▼                   ▼                                    ▼
   ┌───────────────────┐ ┌─────────────────────┐               ┌────────────────────┐
   │  Create a Group     │ │ Split with one       │               │  Join with a code   │
   │  (name + label)      │ │ person (quick 1:1)   │               │  (/join, fallback) │
   └──────────┬───────────┘ └──────────┬───────────┘               └──────────┬──────────┘
              │  generates code+link    │  generates code+link,                │  resolves code
              │                         │  skips straight to Add Expense       │
              └────────────┬────────────┴───────────────┬───────────────────────┘
                             ▼
                 ┌─────────────────────────┐
                 │   Group View  (/g/CODE)   │  ◄── most people land here
                 │   directly via shared link │      directly, skipping
                 └────────────┬───────────────┘      the homepage entirely
                               │
      ┌────────────┬──────────┼───────────┬─────────────┐
      ▼            ▼          ▼           ▼             ▼
 Add/Edit      Add/Remove   Settle Up   Share invite   "Who are
 Expense       Person                    link          you?" (once
                                                        per group,
                                                        skippable)
```

## 2. Screen-by-Screen

### 2.1 Homepage (`/`)
- Three actions: **Create a Group** (primary), **Split with one person** (quick 1:1, §2.2), **Join with a code** (secondary — most real usage bypasses the homepage entirely via a shared link straight to `/g/CODE`).
- If this browser has recently-opened groups in local storage, show them as quick shortcuts. Purely a convenience list — not the access mechanism (see TECH_STACK.md §2).

### 2.2 Split with One Person (Quick 1:1)
- Under the hood this is the exact same `Group` entity as §2.3 — just a 2-member group with a friendlier on-ramp. No new data model, no special-casing later (a quick 1:1 can grow into a full multi-person group at any time via the normal Add Person flow).
- Fields: **your name**, **their name** — nothing else required.
- On submit: creates a group with `name` auto-set to "You & {their name}" and `label` auto-set to "Individual" (both editable later from Group View), adds both people as members, generates a join code/link exactly like any group, and sets your local "who am I" identity for this group immediately (no separate §2.5 prompt needed — already answered).
- Skips straight to the **Add Expense** modal (§2.7) instead of landing on an empty Group View — the point of this path is "I want to log this right now."
- After saving that first expense, lands on Group View like any other group. The invite link is available if you want to share it or add a third person, but nothing forces that.

### 2.3 Create Group
- Fields: group name, optional free-text label (Home/Trip/Individual/etc. — cosmetic only, per PRD §6.1).
- On submit: group is created server-side, join code generated.
- Immediately prompts **"Add people to this group"** (name-only, repeatable) before landing on the main view — an empty group isn't useful, and this avoids a second trip back to "add person" right after creation.
- Lands on Group View with the **Share invite link** action already surfaced (see §2.6).

### 2.4 Join Group
- **Primary path:** tapping a shared link (`/g/CODE`) resolves directly to Group View. No intermediate screen.
- **Fallback path:** `/join` — a plain code-entry form, for cases where the code was read aloud or a link didn't render as tappable text.
- Invalid/unknown code → "Group not found" message with a retry field and a "Create a new group" option.

### 2.4b Sign In (optional, anywhere) — added 2026-08-30
- Reached from the Profile control in the navbar, or from `/groups` when signed out. Nothing else in the app links to it, and nothing requires it.
- One button, styled like the rest of the app rather than Google's own rendered widget, that opens Google's sign-in popup (added 2026-09-05, see `decision-log.md`). The script is fetched only when the button actually renders, so anonymous visitors never pay for it.
- On success the browser's remembered group identities are silently claimed for the account, so "My Groups" is populated immediately rather than empty.
- Signing out is spelled out: entries stay with the account, and are editable again on signing back in.

### 2.4c My Groups (`/groups`) — added 2026-08-30
- Every group the signed-in account has a live person in, newest activity first: name, member and expense counts, last activity, and your net balance with direction.
- A plain list, not a card grid — these are records, and the balance column is the useful comparison between rows.
- Signed out, the page explains what signing in buys and offers the button; it does not redirect or block.
- A group you were removed from drops off the list, even though the expenses you added to it remain in that group.

### 2.5 "Who Are You?" (first visit to a group, per browser) — CONFIRMED
- On first landing in a given group from a given browser, show the current member list and ask the person to pick which name is theirs (or add themselves if not listed yet).
- **Fully skippable** — the single top-right X is labeled "Just looking" and continues straight to Group View with no identity picked.
- This prompt is a full-page overlay with focus trapping, background scroll locking, safe-area padding, focus restoration, and Escape support.
- Stored in that browser's local storage, scoped to that one group. **Also sent to the server as of 2026-08-30** (`POST /people/:id/claim`), which links that person to your session — that is what makes "My Groups" possible and what carries your identity to a new device once you sign in. Still not an account, still gates nothing.
- When the two disagree — local storage says one person, your account claims another — **the account's claim wins**, since it is the one that followed you here from another device.
- Effect when set: defaults the payer field to "you" on new expenses, and highlights your row in the balance summary. Nothing else changes — someone who skips this can still add expenses and pick any payer manually every time.
- Returning to the same group on the same browser skips this prompt (already known).
- Not shown for groups created via §2.2 Quick 1:1 — already answered during creation.

### 2.6 Group View (`/g/CODE`) — the hub
- Header: group name + label.
- Member list, with "you" highlighted if identified (§2.5). Tapping a member opens remove/reassign actions (§2.8).
- Two semantic tabs switch between **Expenses** and **Balances**. **Expenses** is the default. Selection is local UI state only and resets to Expenses when the view is remounted or reloaded.
- Expenses tab: newest-first expense list showing description, amount, payer, and date. Tapping one opens it for edit. Empty state: "No expenses yet — add the first one."
- Balances tab: pairwise "who owes whom" within this group, updated in real time as anyone in the group makes changes (see TECH_STACK.md §4). Empty state explains that balances appear after an expense is added.
- The header, member chips, Share invite link, and bottom-anchored **Add Expense** action remain present regardless of the selected tab. **Settle Up** is available on the Balances tab only.
- No manual refresh ever needed — Socket.io pushes updates to everyone viewing this group.

### 2.7 Add / Edit Expense (full-page overlay over Group View) — CONFIRMED
- The overlay has one exit affordance: an X in the top-right. It traps focus, locks background scrolling, restores focus to the launching control on close, supports Escape as an equivalent close action, and respects device safe-area insets.
- Fields: required description, amount (USD), date (defaults to today), payer (defaults to "you" if identified, otherwise must be picked), split method (equal / percent / custom), and participants (checkboxes, defaults to all current members). Expense notes are not an MVP capability.
- Paid by and Date are equal-width side-by-side controls above 360px and stack below 360px. Date is a labeled native `input type="date"`.
- Equal is pre-selected and all current members are pre-checked. Each participant row shows the name and computed dollar amount. The payer may be deselected, but at least one participant is required.
- Percent/custom split methods reveal a per-selected-person input once participants are chosen. Unresolved rows show an em dash with a live entered/remaining summary.
- Split amounts render currency with exactly two decimal places. Any leftover cents from uneven division go to the first selected participant in deterministic split order; the UI and server use the same result.
- Save writes to the server and closes the overlay; the update reaches every other open device in that group live, without them doing anything. Closing a dirty form first confirms discard; an untouched form closes immediately.

### 2.8 Add / Remove Person
- **Add:** name only, from Group View's member list. Blocked past 20 members (PRD §6.1) with an inline message.
- **Remove:**
  - If the person is the payer on any existing expense, removal is blocked with a message pointing at those expenses — reassign the payer first (PRD §6.2, TECH_STACK.md §3).
  - Otherwise, confirm removal → their splits on remaining expenses are redistributed automatically per the rules already defined → Group View updates live for everyone.

### 2.9 Settle Up (full-page overlay over Group View)
- Opened from a specific balance row, so "From" and "To" are prefilled from **that pair** (editable behind a pencil disclosure); amount is prefilled with the full owed amount, editable for a partial settlement; a free-text note ("Venmo", "cash", etc.) is required. The old "largest outstanding pair" prefill was removed in Phase 4 when every balance row gained its own Settle Up button.
- In `simplified` settle mode (§2.11) the row comes from the minimized plan rather than the raw pairwise list, so the overpayment check measures against the plan the viewer is actually following.
- The overlay uses the same one-X exit, focus, scroll, safe-area, Escape, and dirty-form confirmation behavior as Add/Edit Expense.
- **Payment handle (added 2026-09-06, Sprint 6.4):** when the payee has one set, a row above the Note field shows it with a Copy action. Copy puts the **handle and the amount together** on the clipboard, since that is what has to be retyped into the payment app, and confirms with a haptic plus a visible "Copied" label. Where the clipboard is unavailable (insecure origin, denied permission) nothing fails loudly — the handle is on screen and selectable. No QR code: a handle is free text, so a QR of "@alice" scans to the literal string and opens nothing.
- Confirm writes a `Settlement` record; balances recompute and update live for everyone (record-keeping only — no money actually moves, per PRD §6.4).

### 2.10 Close the Ledger / Reopen — added 2026-09-06 (Sprint 6.3)
- Entry point is the Balances tab, alongside the balances themselves. No new screen in the nav and no new share surface — the existing join link is still the shareable summary.
- Closing opens a review screen before anything is written: a forgive threshold (prefilled from the group, editable), the list of balances that would be **written off** at that threshold, and the minimum-transaction plan for whatever is left. The list recomputes per keystroke, locally, so the number and the consequence are always on screen together.
- **A group can only be closed when it balances.** While real payments remain, the Confirm action is disabled and the threshold is the dial you raise until it clears — leaving two honest exits: settle it for real, or write it off on the record. A balanced ledger renders the zero figure in `--text-zero`.
- Confirming writes one `Settlement` per forgiven balance (note: "Forgiven at close-out"), stamps `closedAt`, logs `group_close`, and broadcasts. Nothing is deleted; the record is preserved.
- A closed group renders **fully read-only** — no add expense, no settle, no member add/remove/rename, no currency change; the API 409s each one rather than relying on the UI to hide it. Identifying yourself ("Who are you?") still works.
- **Reopen** clears `closedAt` and nothing else. The close-out settlements stay, because a forgiven row is indistinguishable in kind from a real cash payment; over-forgiving is undone one settlement at a time with the existing Undo, after reopening.

### 2.11 Settle Mode (Balances tab) — added 2026-09-06 (Sprint 6.3 amendment)
- The Balances tab offers a group-level choice between **direct** (raw pairwise "who owes whom", the default) and **simplified** (the minimized payment plan). It renders as a radio group, not a view tab — it is a setting that changes what `Settle Up` writes against, and tabs cannot describe an option before you pick it.
- **Self-suppressing:** the choice does not render at all unless simplifying actually reduces the number of payments.
- The mode is stored on the group and shared over the existing realtime broadcast, deliberately **not** per-device: with both surfaces settleable, a per-device preference would let two people follow two instruction sets against the same debt and double-record the work.
- Balance rows read "pays" in simplified mode and "owes" in direct mode, since a plan transfer is often a synthetic pair rather than a debt that literally exists between those two people.

## 3. Real-Time Behavior Notes

- Every mutating action (expense add/edit/delete, person add/remove, settle up) follows the same pattern: write to Postgres → broadcast to the group's Socket.io room → every connected client re-renders the affected part of the screen.
- No page you're actively viewing should ever require a manual refresh to reflect someone else's change.

## 4. Validation & Edge Cases

| Situation | Behavior |
|---|---|
| Group at 20 members, someone tries to add a 21st | Blocked with an inline message |
| Removing a person who's a payer on an expense | Blocked, points to the expense(s) needing reassignment first |
| Unknown/mistyped join code | "Group not found," offer retry or create new |
| Percent split doesn't sum to 100% | Inline validation before save |
| Custom amount split doesn't sum to the expense total | Inline validation before save |
| Browser's local shortcut list is at 20 groups, person creates/joins group #21 | No block — group works normally server-side; oldest entry silently evicted from the local shortcut list (LRU), no warning shown |
| Client's Socket.io connection drops and reconnects (phone locks, wifi blip) | On reconnect, client refetches the group's current state via the existing REST `GET /groups/:code`, then resumes listening for live events — no missed-event replay logic needed |
