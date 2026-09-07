import { describe, expect, it } from 'vitest';

import { forgiveBelow, minimizeTransactions } from './settleUp.js';
import type { PairBalance } from './split/balances.js';

const b = (fromPersonId: string, toPersonId: string, amountCents: number): PairBalance => ({
  fromPersonId,
  toPersonId,
  amountCents
});

describe('forgiveBelow', () => {
  it('forgives balances at or below the threshold, keeps the rest', () => {
    const { forgiven, remaining } = forgiveBelow([b('a', 'b', 50), b('c', 'd', 100), b('e', 'f', 101)], 100);
    expect(forgiven).toEqual([b('a', 'b', 50), b('c', 'd', 100)]);
    expect(remaining).toEqual([b('e', 'f', 101)]);
  });

  it('forgives nothing at a zero threshold', () => {
    const { forgiven, remaining } = forgiveBelow([b('a', 'b', 1)], 0);
    expect(forgiven).toEqual([]);
    expect(remaining).toEqual([b('a', 'b', 1)]);
  });
});

describe('minimizeTransactions', () => {
  it('returns nothing when there are no balances', () => {
    expect(minimizeTransactions([])).toEqual([]);
  });

  it('passes a single debt straight through', () => {
    expect(minimizeTransactions([b('a', 'b', 500)])).toEqual([b('a', 'b', 500)]);
  });

  it('collapses a chain a->b->c into one transfer', () => {
    // a owes b 500, b owes c 500  =>  a should just pay c 500.
    expect(minimizeTransactions([b('a', 'b', 500), b('b', 'c', 500)])).toEqual([b('a', 'c', 500)]);
  });

  it('preserves every net position while cutting the transaction count', () => {
    const balances = [b('a', 'b', 700), b('a', 'c', 300), b('d', 'b', 200), b('c', 'd', 400)];
    const plan = minimizeTransactions(balances);

    const netOf = (rows: PairBalance[]) => {
      const net = new Map<string, number>();
      for (const row of rows) {
        net.set(row.fromPersonId, (net.get(row.fromPersonId) ?? 0) - row.amountCents);
        net.set(row.toPersonId, (net.get(row.toPersonId) ?? 0) + row.amountCents);
      }
      return net;
    };

    // Each person ends owing / owed exactly what they did before.
    expect(Object.fromEntries(netOf(plan))).toEqual(Object.fromEntries(netOf(balances)));
    // Greedy never needs more transfers than (people - 1).
    expect(plan.length).toBeLessThanOrEqual(3);
  });
});
