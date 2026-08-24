import { describe, expect, it } from 'vitest';

import { centsToDollars, dollarsToCents, equalSplitCents } from './splitPreview';

describe('equalSplitCents', () => {
  it('splits evenly when it divides cleanly', () => {
    expect(equalSplitCents(900, 3)).toEqual([300, 300, 300]);
  });

  it('takes the leftover cent back off the first participant when rounding up overshoots', () => {
    // 1100 / 3 = 366.67 -> each rounds to 367 (1101 total, 1 cent over), so 1 cent comes off entry 0
    expect(equalSplitCents(1100, 3)).toEqual([366, 367, 367]);
  });

  it('gives the leftover cents to the first participants when rounding down', () => {
    expect(equalSplitCents(1000, 3)).toEqual([334, 333, 333]);
  });

  it('returns an empty array for zero participants', () => {
    expect(equalSplitCents(1000, 0)).toEqual([]);
  });
});

describe('dollarsToCents / centsToDollars', () => {
  it('round-trips a typed amount', () => {
    expect(dollarsToCents('12.50')).toBe(1250);
    expect(centsToDollars(1250)).toBe('12.50');
  });

  it('treats an unparsable amount as zero', () => {
    expect(dollarsToCents('abc')).toBe(0);
  });
});
