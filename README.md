# BrokeEven

Minimal, real-time expense splitting for friends, housemates, and small groups.

BrokeEven is a no-signup web app for creating a group, sharing an invite link, recording expenses, and seeing who owes whom. It is designed to keep the useful parts of a shared ledger without accounts, paywalls, or unnecessary workflow.

## Status

The product requirements, application flow, technical architecture, and design system are approved. Implementation is planned in phases and has not started yet.

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
- Use the app responsively on mobile and desktop.

## How It Works

1. Create a group or start a quick two-person split.
2. Add people to the group and share the generated invite link.
3. Open the group view and add an expense.
4. Review expenses or switch to the Balances tab.
5. Record a settlement when money changes hands.

The group view opens on **Expenses**. **Balances** is a separate tab so the ledger and settlement summary do not compete for space. **Add Expense** remains available as the single primary action; **Settle Up** is available from the Balances tab.

## Expense Splitting

The Add/Edit Expense flow uses:

- Required description
- Amount in USD
- Date, defaulting to today
- Payer
- Equal, percentage, or custom split method
- Selected participants

All current members are selected by default. The payer may be deselected, but at least one participant is required. Every displayed amount uses two decimal places. When a split produces a leftover cent, it is assigned to the first selected participant in deterministic split order so the shares always equal the expense total.

Expense notes, receipt attachments, recurring expenses, multiple currencies, and split-by-shares are not part of the MVP.

## Access And Data Model

BrokeEven has no accounts, login, or email requirement in the MVP. Anyone with a group's join code has the same editing permissions as the creator.

Groups and their expense history are stored on the server. The browser stores only convenience data:

- Recently opened group shortcuts, limited to 20 entries per browser.
- The selected “Who are you?” identity for each group.

Clearing browser storage does not delete group data. It only removes those local shortcuts and identity selections.

## Technical Architecture

- Frontend: Vite, React, and TypeScript
- Routing: React Router
- Styling: Tailwind CSS
- Backend: Node.js, Express, and TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Real-time sync: Socket.io
- PWA: `vite-plugin-pwa`
- Hosting: Vercel for the frontend and Railway for the backend/database

The browser uses REST for reads and writes and Socket.io for live group updates. Mutations are written to PostgreSQL before the updated state is broadcast to the group's Socket.io room. Clients refetch the group after reconnecting.

## Design Direction

BrokeEven is designed as a ledger rather than a dashboard:

- Ledger Paper: `#E6F1E2`
- Paper White: `#F8FBF5`
- Ink Forest: `#1E2E23`
- Ledger Green: `#2F6B4F`
- Debt Red: `#A8402B`
- Brass: `#B8912B`
- Brass UI: `#96762A`

Typography uses Fraunces for restrained display moments, IBM Plex Sans for interface text, and IBM Plex Mono for currency and balance figures.

The interface uses full-page overlays for Add/Edit Expense, Settle Up, and the first-visit identity prompt. Overlays support keyboard focus management, safe-area insets, reduced motion, and discard confirmation for dirty forms.

## MVP Boundaries

Deferred until after the MVP:

- Email magic-link identity and a “My Groups” dashboard
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

- [`PRD.md`](PRD.md): product goals, user stories, MVP requirements, and scope
- [`APP_FLOW.md`](APP_FLOW.md): routes, screens, interactions, and edge cases
- [`TECH_STACK.md`](TECH_STACK.md): architecture, data model, API behavior, and deployment
- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md): visual language, components, forms, and accessibility floor
- [`UIUX_rules.md`](UIUX_rules.md): interaction and usability baseline
- [`ROADMAP.md`](ROADMAP.md): implementation phases, sprints, and tasks

## Roadmap

1. Build and test the backend core, including split resolution and balance computation.
2. Build the frontend shell and entry flows.
3. Add real-time synchronization.
4. Apply the approved design system and make the app installable as a PWA.
5. Deploy, harden, and validate the complete user journey.

## License

No license has been selected yet.
