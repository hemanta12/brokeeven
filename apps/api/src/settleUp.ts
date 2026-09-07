import type { PairBalance } from './split/balances.js';

// Forgiven at amount <= threshold, inclusive.
export function forgiveBelow(
  balances: PairBalance[],
  thresholdCents: number
): { forgiven: PairBalance[]; remaining: PairBalance[] } {
  const forgiven: PairBalance[] = [];
  const remaining: PairBalance[] = [];
  for (const balance of balances) {
    (balance.amountCents <= thresholdCents ? forgiven : remaining).push(balance);
  }
  return { forgiven, remaining };
}

// ponytail: greedy largest-creditor against largest-debtor. Valid but not
// provably minimal (the problem is NP-hard); subset-sum / ILP if it must be.
export function minimizeTransactions(balances: PairBalance[]): PairBalance[] {
  const net = new Map<string, number>(); // personId -> cents; >0 owed money, <0 owes
  for (const balance of balances) {
    net.set(balance.fromPersonId, (net.get(balance.fromPersonId) ?? 0) - balance.amountCents);
    net.set(balance.toPersonId, (net.get(balance.toPersonId) ?? 0) + balance.amountCents);
  }

  const positions = [...net.entries()]
    .map(([id, cents]) => ({ id, cents }))
    .filter((position) => position.cents !== 0);

  const plan: PairBalance[] = [];
  // ponytail: O(n^2) re-scan for the two extremes each step; n is capped by the
  // 20-member group limit, so it never matters.
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
