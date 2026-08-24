export type ExpenseForBalance = { payerId: string; splits: { personId: string; amountCents: number }[] };
export type SettlementForBalance = { fromPersonId: string; toPersonId: string; amountCents: number };
export type PairBalance = { fromPersonId: string; toPersonId: string; amountCents: number };

// Balances are computed on read, never stored (TECH_STACK.md §4): ExpenseSplit
// amounts (minus the payer's own share) minus Settlement payments, netted per
// pair. Raw pairwise amounts only — no debt-simplification (PRD §6.4).
export function computeBalances(expenses: ExpenseForBalance[], settlements: SettlementForBalance[]): PairBalance[] {
  const owed = new Map<string, number>(); // `${owerId}|${owedToId}` -> net cents

  const addOwed = (owerId: string, owedToId: string, cents: number) => {
    if (owerId === owedToId) return;
    const key = `${owerId}|${owedToId}`;
    owed.set(key, (owed.get(key) ?? 0) + cents);
  };

  for (const expense of expenses) {
    for (const split of expense.splits) {
      addOwed(split.personId, expense.payerId, split.amountCents);
    }
  }
  for (const settlement of settlements) {
    addOwed(settlement.fromPersonId, settlement.toPersonId, -settlement.amountCents);
  }

  const seenPairs = new Set<string>();
  const result: PairBalance[] = [];
  for (const key of owed.keys()) {
    const [owerId = '', owedToId = ''] = key.split('|');
    const pairKey = [owerId, owedToId].sort().join('|');
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    const forward = owed.get(`${owerId}|${owedToId}`) ?? 0;
    const backward = owed.get(`${owedToId}|${owerId}`) ?? 0;
    const diff = forward - backward;

    if (diff > 0) result.push({ fromPersonId: owerId, toPersonId: owedToId, amountCents: diff });
    else if (diff < 0) result.push({ fromPersonId: owedToId, toPersonId: owerId, amountCents: -diff });
  }
  return result;
}
