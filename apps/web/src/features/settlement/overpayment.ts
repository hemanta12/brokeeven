import type { Balance } from '../group/types';

// What the selected From owes the selected To right now, in cents. Recomputed
// from the live balance list because From/To stay editable — the opened row's
// amount answers a different question once they change.
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

// Overpaying is legitimate (paying ahead) but also what a decimal typo looks
// like — 6667 for 66.67 silently creates a large reverse debt, so the excess is
// flagged. Cents throughout to avoid float drift; null when nothing to warn about.
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
