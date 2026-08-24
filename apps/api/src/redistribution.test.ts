import { describe, expect, it } from 'vitest';

import { redistributeAmounts } from './redistribution.js';

describe('redistributeAmounts — equal', () => {
  it('divides the full amount across fewer remaining people', () => {
    // $10.00 originally split 4 ways; one person removed, 3 remain.
    const result = redistributeAmounts({ method: 'equal', remainingCount: 3, totalCents: 1000 });
    expect(result.amountsCents).toEqual([334, 333, 333]);
    expect(result.amountsCents.reduce((a, b) => a + b, 0)).toBe(1000);
  });
});

describe('redistributeAmounts — percent', () => {
  it('renormalizes remaining percents to sum to 100', () => {
    // Original: a=50, b=30, c=20. c is removed; a and b renormalize to 100.
    const result = redistributeAmounts({ method: 'percent', remainingPercents: [50, 30], totalCents: 10000 });
    expect(result.percents).toEqual([62.5, 37.5]);
    expect(result.amountsCents).toEqual([6250, 3750]);
    expect(result.amountsCents.reduce((a, b) => a + b, 0)).toBe(10000);
  });

  it('handles a renormalization that does not divide evenly', () => {
    // Original: a=33.33, b=33.33, c=33.34. c removed; a and b split ~50/50 of $10.01.
    const result = redistributeAmounts({ method: 'percent', remainingPercents: [33.33, 33.33], totalCents: 1001 });
    expect(result.amountsCents.reduce((a, b) => a + b, 0)).toBe(1001);
    expect(result.percents!.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
  });
});

describe('redistributeAmounts — custom', () => {
  it('redistributes the removed dollar amount proportionally to remaining amounts', () => {
    // Original: a=$10, b=$20, c=$30 ($60 total). a removed ($10); b:c ratio is 20:30.
    const result = redistributeAmounts({
      method: 'custom',
      remainingAmountsCents: [2000, 3000],
      removedAmountCents: 1000
    });
    expect(result.amountsCents).toEqual([2400, 3600]);
    expect(result.amountsCents.reduce((a, b) => a + b, 0)).toBe(2000 + 3000 + 1000);
  });

  it('keeps the exact total when the redistribution does not divide evenly', () => {
    const result = redistributeAmounts({
      method: 'custom',
      remainingAmountsCents: [333, 667],
      removedAmountCents: 101
    });
    expect(result.amountsCents.reduce((a, b) => a + b, 0)).toBe(333 + 667 + 101);
  });
});
