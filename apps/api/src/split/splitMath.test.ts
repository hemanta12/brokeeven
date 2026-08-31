import { describe, expect, it } from 'vitest';

import { distributeProportionally } from './splitMath.js';

describe('distributeProportionally', () => {
  it('splits evenly when it divides cleanly', () => {
    expect(distributeProportionally(900, [1, 1, 1])).toEqual([300, 300, 300]);
  });

  it('assigns leftover pennies to the first entries in input order', () => {
    // $10.00 / 3 = 333.33... -> 334, 333, 333
    expect(distributeProportionally(1000, [1, 1, 1])).toEqual([334, 333, 333]);
  });

  it('handles remainders larger than one cent', () => {
    // 100 cents / 7 = 14.28... -> two people get 15, five get 14
    expect(distributeProportionally(100, [1, 1, 1, 1, 1, 1, 1])).toEqual([15, 15, 14, 14, 14, 14, 14]);
  });

  it('weights shares proportionally (percent-style)', () => {
    // 50/30/20 of $100.00
    expect(distributeProportionally(10000, [50, 30, 20])).toEqual([5000, 3000, 2000]);
  });

  it('corrects negative rounding leftover by trimming the first entries', () => {
    const result = distributeProportionally(1, [1, 1, 1]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(1);
    expect(result).toEqual([1, 0, 0]);
  });

  it('always sums exactly to totalCents regardless of weight skew', () => {
    const result = distributeProportionally(1001, [7, 13, 5, 1]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(1001);
  });

  it('returns an empty array for no weights', () => {
    expect(distributeProportionally(500, [])).toEqual([]);
  });
});
