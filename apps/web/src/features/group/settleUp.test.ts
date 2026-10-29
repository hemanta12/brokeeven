import { describe, expect, it } from 'vitest';

import { effectiveSettleMode, forgiveBelow, minimizeTransactions, offersFewestPayments } from './settleUp';
import type { Balance } from './types';

const bal = (fromPersonId: string, toPersonId: string, amount: string): Balance => ({
  fromPersonId,
  toPersonId,
  amount
});

describe('forgiveBelow', () => {
  it('splits balances at the threshold', () => {
    const { forgiven, remaining } = forgiveBelow([bal('a', 'b', '0.40'), bal('c', 'd', '1.00'), bal('e', 'f', '1.01')], 100);
    expect(forgiven.map((b) => b.amount)).toEqual(['0.40', '1.00']);
    expect(remaining.map((b) => b.amount)).toEqual(['1.01']);
  });
});

describe('minimizeTransactions', () => {
  it('collapses a chain into one transfer', () => {
    expect(minimizeTransactions([bal('a', 'b', '5.00'), bal('b', 'c', '5.00')])).toEqual([
      { fromPersonId: 'a', toPersonId: 'c', amountCents: 500 }
    ]);
  });

  it('preserves each net position', () => {
    const balances = [bal('a', 'b', '7.00'), bal('a', 'c', '3.00'), bal('d', 'b', '2.00')];
    const plan = minimizeTransactions(balances);
    const net = (rows: { fromPersonId: string; toPersonId: string; amountCents: number }[]) => {
      const map = new Map<string, number>();
      for (const row of rows) {
        map.set(row.fromPersonId, (map.get(row.fromPersonId) ?? 0) - row.amountCents);
        map.set(row.toPersonId, (map.get(row.toPersonId) ?? 0) + row.amountCents);
      }
      return Object.fromEntries(map);
    };
    expect(net(plan)).toEqual(net(balances.map((b) => ({ ...b, amountCents: Math.round(Number(b.amount) * 100) }))));
  });
});

describe('offersFewestPayments / effectiveSettleMode', () => {
  const chain = [bal('a', 'b', '5.00'), bal('b', 'c', '5.00')];
  const unrelated = [bal('a', 'b', '5.00'), bal('c', 'd', '5.00')];

  it('offers fewest only when netting drops a payment', () => {
    expect(offersFewestPayments(chain)).toBe(true);
    expect(offersFewestPayments(unrelated)).toBe(false);
    expect(offersFewestPayments([])).toBe(false);
  });

  it('keeps the stored mode while it helps and falls back to direct when it does not', () => {
    expect(effectiveSettleMode(chain, 'simplified')).toBe('simplified');
    expect(effectiveSettleMode(unrelated, 'simplified')).toBe('direct');
  });

  it('treats a debt cycle that nets to nothing as not offering fewest', () => {
    const cycle = [bal('a', 'b', '5.00'), bal('b', 'c', '5.00'), bal('c', 'a', '5.00')];
    expect(offersFewestPayments(cycle)).toBe(false);
  });
});
