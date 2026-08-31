import type { Balance } from '../group/types';

// What the selected From owes the selected To right now, in cents. Recomputed
// from the live balance list rather than the row the modal was opened from,
// because From and To both stay editable — swap them and the original row's
// amount is answering a different question.
export function owedCents(balances: Balance[], fromPersonId: string, toPersonId: string): number {
  const match = balances.find(
    (balance) => balance.fromPersonId === fromPersonId && balance.toPersonId === toPersonId
  );
  return match ? Math.round(Number(match.amount) * 100) : 0;
}

export interface Overpayment {
  owed: number;
  excess: number;
}

// Settling MORE than is owed is legitimate (rounding up, paying ahead) but is
// also exactly what a decimal typo looks like: 6667 instead of 66.67 silently
// creates a $6,600 debt in the opposite direction. Partial settlement being
// allowed is what makes the amount alone ambiguous — an amount *under* the
// balance is ordinary, so only the excess is worth flagging.
//
// Returns null when there is nothing to warn about; cents throughout, so the
// comparison never trips over floating-point drift.
export function checkOverpayment(
  balances: Balance[],
  fromPersonId: string,
  toPersonId: string,
  amount: string
): Overpayment | null {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  const amountCents = Math.round(parsed * 100);
  const owed = owedCents(balances, fromPersonId, toPersonId);
  if (amountCents <= owed) return null;

  return { owed: owed / 100, excess: (amountCents - owed) / 100 };
}
