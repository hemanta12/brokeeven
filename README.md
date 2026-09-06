# BrokeEven

Minimal, real-time expense splitting for friends, housemates, and small groups.

BrokeEven is a no-signup web app for creating a group, sharing an invite link, recording expenses, and seeing who owes whom. It is designed to keep the useful parts of a shared ledger without accounts, paywalls, or unnecessary workflow.

## Status

BrokeEven is live and in active use. The core no-account flow below is built, and optional Google sign-in adds a "My Groups" list for finding your groups across devices without changing how joining or creating a group works.

## What It Does

- Create a group without an account.
- Invite people with a shareable join link or code.
- Add and remove group members by name.
- Record expenses in USD.
- Choose who paid and reassign the payer later.
- Split an expense equally, by percentage, or by custom dollar amounts.
- Include any subset of current members in a split.
- View expenses and pairwise balances in real time.
- Record partial or complete settlements with a note such as “Venmo” or “cash.”
- Undo a settlement, and follow a group's activity feed.
- Optionally sign in with Google to see your groups on one screen across devices.
- Use the app responsively on mobile and desktop, installable as a PWA.

## How It Works

1. Create a group or start a quick two-person split.
2. Add people to the group and share the generated invite link.
3. Open the group view and add an expense.
4. Review expenses or switch to the Balances tab.
5. Record a settlement when money changes hands.

The group view opens on **Expenses**. **Balances** is a separate tab so the ledger and settlement summary do not compete for space. **Add Expense** remains available as the single primary action; **Settle Up** is available from the Balances tab.

## Expense Splitting

The Add/Edit Expense flow uses:

- Required title, with an optional description
- Amount in USD
- Date, defaulting to today
- Payer
- Equal, percentage, or custom split method
- Selected participants

All current members are selected by default. The payer may be deselected, but at least one participant is required. Every displayed amount uses two decimal places. When a split produces a leftover cent, it is assigned to the first selected participant in deterministic split order so the shares always equal the expense total.

Receipt attachments, recurring expenses, multiple currencies, and split-by-shares are not part of the MVP.

## Access And Data Model

No account, login, or email is required to join a group, add expenses, or settle up — Google sign-in is optional and only adds cross-device group discovery. Anyone with a group's join code can join and add expenses, but each person may only edit or delete the expenses and settlements they created themselves; everyone else's are read-only.

Groups and their expense history are stored on the server. Without signing in, the browser stores only the selected “Who are you?” identity for each group it has opened. Signing in replaces that with a server-side “My Groups” list, so groups are found by account rather than by browser.

Clearing browser storage does not delete group data. For a signed-out visitor it only clears which person they said they were in each group; a signed-in account is unaffected.

## Technical Architecture

- Frontend: Vite, React, and TypeScript
- Routing: React Router
- Styling: Tailwind CSS
- Backend: Node.js, Express, and TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Real-time sync: Socket.io
- PWA: `vite-plugin-pwa`
- Auth: optional Google OAuth, signed session cookie
- Hosting: Vercel for the frontend and Railway for the backend/database

The browser uses REST for reads and writes and Socket.io for live group updates. Mutations are written to PostgreSQL before the updated state is broadcast to the group's Socket.io room. Clients refetch the group after reconnecting.

## Design Direction

BrokeEven is designed as a ledger rather than a dashboard:

- Page ground: `#F0F2F0`
- Ink: `#12140F`
- Accent (primary actions): `#0A6B42`
- Debt / negative: `#BE3623`
- Notice: `#7A5E12`
- Band (landing proof band, group header): `#123322`

Typography uses Geist for interface text and Geist Mono for every currency figure the app displays, kept tabular by construction.

The interface uses full-page overlays for Add/Edit Expense, Settle Up, and the first-visit identity prompt. Overlays support keyboard focus management, safe-area insets, reduced motion, and discard confirmation for dirty forms.

## MVP Boundaries

Deferred until after the MVP:

- Debt simplification
- Consolidated balances across groups
- Notifications
- Recurring expenses
- Receipt photos
- Multi-currency support
- Data export
- Payment integrations
- Group sub-categories
- Split-by-shares

## Project Documentation

- [`docs/PRD.md`](docs/PRD.md): product goals, user stories, MVP requirements, and scope
- [`docs/APP_FLOW.md`](docs/APP_FLOW.md): routes, screens, interactions, and edge cases
- [`docs/TECH_STACK.md`](docs/TECH_STACK.md): architecture, data model, API behavior, and deployment
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md): visual language, components, forms, and accessibility floor

## License

This project is licensed under the [MIT License](https://opensource.org/license/mit/).
