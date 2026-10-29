import { effectiveSettleMode, minimizeTransactions } from './settleUp';
import type { Balance, Expense, SettleMode } from './types';

function toCents(amount: string): number {
  return Math.round(Number(amount) * 100);
}

function involves(row: Pick<Balance, 'fromPersonId' | 'toPersonId'>, personId: string): boolean {
  return row.fromPersonId === personId || row.toPersonId === personId;
}

// All-time net from the raw balances: what comes back minus what you pay. The
// same figure in either settle mode, since netting only reroutes who pays whom.
export function viewerNetCents(balances: Balance[], personId: string): number {
  let net = 0;
  for (const balance of balances) {
    if (balance.toPersonId === personId) net += toCents(balance.amount);
    if (balance.fromPersonId === personId) net -= toCents(balance.amount);
  }
  return net;
}

// Rows the Balances tab shows for the viewer: the plan's in Fewest payments
// mode, the raw balances otherwise.
export function viewerOpenPayments(balances: Balance[], personId: string, settleMode: SettleMode): number {
  const rows: Pick<Balance, 'fromPersonId' | 'toPersonId'>[] =
    effectiveSettleMode(balances, settleMode) === 'simplified' ? minimizeTransactions(balances) : balances;
  return rows.filter((row) => involves(row, personId)).length;
}

// `expenses` is whatever period the caller wants the ring to cover.
export function periodTotals(expenses: Expense[], personId: string): { totalCents: number; shareCents: number } {
  let totalCents = 0;
  let shareCents = 0;
  for (const expense of expenses) {
    totalCents += toCents(expense.amount);
    for (const split of expense.splits) {
      if (split.personId === personId) shareCents += toCents(split.amount);
    }
  }
  return { totalCents, shareCents };
}

// 0..1 of the ring to fill; no total, no arc.
export function shareFraction(shareCents: number, totalCents: number): number {
  if (totalCents <= 0 || shareCents <= 0) return 0;
  return Math.min(1, shareCents / totalCents);
}

// Mono glyphs run ~0.62em wide. Shrinks a figure so it fits `maxWidth` rather
// than overflowing a half-width card, down to a legible floor.
export function fitFontSize(text: string, maxSize: number, maxWidth: number, minSize: number): number {
  return Math.max(minSize, Math.min(maxSize, maxWidth / (Math.max(text.length, 1) * 0.62)));
}
