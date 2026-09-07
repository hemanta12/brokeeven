import type { Balance } from './types';

export interface Transfer {
  fromPersonId: string;
  toPersonId: string;
  amountCents: number;
}

function toCents(amount: string): number {
  return Math.round(Number(amount) * 100);
}

// Mirrors apps/api/src/settleUp.ts; keep the two in step. Client-side because the
// close-group review recomputes on every threshold keystroke.
export function forgiveBelow(balances: Balance[], thresholdCents: number): { forgiven: Balance[]; remaining: Balance[] } {
  const forgiven: Balance[] = [];
  const remaining: Balance[] = [];
  for (const balance of balances) {
    (toCents(balance.amount) <= thresholdCents ? forgiven : remaining).push(balance);
  }
  return { forgiven, remaining };
}

// Greedy largest-creditor <-> largest-debtor. A valid settling set, not a
// provably minimal one (see the API twin).
export function minimizeTransactions(balances: Balance[]): Transfer[] {
  const net = new Map<string, number>();
  for (const balance of balances) {
    const cents = toCents(balance.amount);
    net.set(balance.fromPersonId, (net.get(balance.fromPersonId) ?? 0) - cents);
    net.set(balance.toPersonId, (net.get(balance.toPersonId) ?? 0) + cents);
  }
  const positions = [...net.entries()].map(([id, cents]) => ({ id, cents })).filter((position) => position.cents !== 0);

  const plan: Transfer[] = [];
  while (true) {
    const creditor = positions.reduce<{ id: string; cents: number } | null>(
      (max, position) => (position.cents > (max?.cents ?? 0) ? position : max),
      null
    );
    const debtor = positions.reduce<{ id: string; cents: number } | null>(
      (min, position) => (position.cents < (min?.cents ?? 0) ? position : min),
      null
    );
    if (!creditor || !debtor) break;

    const amountCents = Math.min(creditor.cents, -debtor.cents);
    plan.push({ fromPersonId: debtor.id, toPersonId: creditor.id, amountCents });
    creditor.cents -= amountCents;
    debtor.cents += amountCents;
  }
  return plan;
}
