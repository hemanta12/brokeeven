import { describe, expect, it } from 'vitest';

import {
  fitFontSize,
  periodTotals,
  shareFraction,
  viewerNetCents,
  viewerOpenPayments,
} from './summaryMath';
import type { Balance, Expense } from './types';

const bal = (fromPersonId: string, toPersonId: string, amount: string): Balance => ({
  fromPersonId,
  toPersonId,
  amount,
});

describe('viewerNetCents', () => {
  it('is money to the viewer minus money from the viewer', () => {
    const balances = [bal('a', 'me', '35.00'), bal('me', 'b', '25.00'), bal('a', 'b', '99.00')];

    expect(viewerNetCents(balances, 'me')).toBe(1000);
  });

  it('is negative when the viewer owes more, and zero for an uninvolved viewer', () => {
    expect(viewerNetCents([bal('me', 'a', '12.34')], 'me')).toBe(-1234);
    expect(viewerNetCents([bal('a', 'b', '5.00')], 'me')).toBe(0);
  });

  it('does not drift on cents', () => {
    expect(viewerNetCents([bal('a', 'me', '0.10'), bal('a', 'me', '0.20')], 'me')).toBe(30);
  });
});

describe('viewerOpenPayments', () => {
  const chain = [bal('me', 'a', '5.00'), bal('a', 'b', '5.00'), bal('c', 'd', '1.00')];

  it('counts the viewer rows from the raw balances in Each balance mode', () => {
    expect(viewerOpenPayments(chain, 'me', 'direct')).toBe(1);
    expect(viewerOpenPayments(chain, 'a', 'direct')).toBe(2);
  });

  it('counts the viewer rows from the minimized plan in Fewest payments mode', () => {
    // a drops out of the chain: me pays b directly.
    expect(viewerOpenPayments(chain, 'a', 'simplified')).toBe(0);
    expect(viewerOpenPayments(chain, 'me', 'simplified')).toBe(1);
  });

  it('falls back to raw balances when Fewest payments would save nothing', () => {
    const unrelated = [bal('me', 'a', '5.00'), bal('b', 'c', '5.00')];

    expect(viewerOpenPayments(unrelated, 'me', 'simplified')).toBe(1);
  });
});

describe('periodTotals', () => {
  const expense = (amount: string, splits: Array<[string, string]>): Expense =>
    ({
      amount,
      splits: splits.map(([personId, splitAmount]) => ({ personId, amount: splitAmount })),
    }) as unknown as Expense;

  it('sums the group total and only the viewer split', () => {
    const expenses = [expense('90.00', [['me', '30.00'], ['a', '60.00']]), expense('10.01', [['me', '5.01'], ['a', '5.00']])];

    expect(periodTotals(expenses, 'me')).toEqual({ totalCents: 10001, shareCents: 3501 });
  });

  it('is zero for no expenses', () => {
    expect(periodTotals([], 'me')).toEqual({ totalCents: 0, shareCents: 0 });
  });
});

describe('shareFraction', () => {
  it('is share over total, clamped, and zero without a total or a share', () => {
    expect(shareFraction(2500, 10000)).toBe(0.25);
    expect(shareFraction(12000, 10000)).toBe(1);
    expect(shareFraction(500, 0)).toBe(0);
    expect(shareFraction(0, 10000)).toBe(0);
  });
});

describe('fitFontSize', () => {
  it('keeps the max size when the text fits, shrinks long figures, and respects the floor', () => {
    expect(fitFontSize('$42.00', 2, 9.25, 1.25)).toBe(2);
    expect(fitFontSize('$12,345.00', 2, 9.25, 1.25)).toBeLessThan(2);
    expect(fitFontSize('$1,234,567,890.00', 2, 9.25, 1.25)).toBe(1.25);
  });
});
