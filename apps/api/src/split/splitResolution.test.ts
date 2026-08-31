import { describe, expect, it } from 'vitest';

import { resolveSplits } from './splitResolution.js';

describe('resolveSplits — equal', () => {
  it('splits into equal cent shares with penny remainder on the first participant', () => {
    const result = resolveSplits(1000, { method: 'equal', personIds: ['a', 'b', 'c'] });
    expect(result).toEqual([
      { personId: 'a', amountCents: 334, percentAtEntry: null },
      { personId: 'b', amountCents: 333, percentAtEntry: null },
      { personId: 'c', amountCents: 333, percentAtEntry: null }
    ]);
  });

  it('rejects an empty participant list', () => {
    const result = resolveSplits(1000, { method: 'equal', personIds: [] });
    expect(result).toEqual({ error: expect.any(String) });
  });

  it('rejects a duplicate participant', () => {
    const result = resolveSplits(1000, { method: 'equal', personIds: ['a', 'a'] });
    expect(result).toEqual({ error: expect.any(String) });
  });
});

describe('resolveSplits — percent', () => {
  it('resolves percentages to dollar shares and stores percentAtEntry', () => {
    const result = resolveSplits(10000, {
      method: 'percent',
      shares: [
        { personId: 'a', percent: 50 },
        { personId: 'b', percent: 30 },
        { personId: 'c', percent: 20 }
      ]
    });
    expect(result).toEqual([
      { personId: 'a', amountCents: 5000, percentAtEntry: 50 },
      { personId: 'b', amountCents: 3000, percentAtEntry: 30 },
      { personId: 'c', amountCents: 2000, percentAtEntry: 20 }
    ]);
  });

  it('rejects percentages that do not sum to 100', () => {
    const result = resolveSplits(10000, {
      method: 'percent',
      shares: [
        { personId: 'a', percent: 50 },
        { personId: 'b', percent: 40 }
      ]
    });
    expect(result).toEqual({ error: expect.any(String) });
  });

  it('rejects a zero or negative percent', () => {
    const result = resolveSplits(10000, {
      method: 'percent',
      shares: [
        { personId: 'a', percent: 100 },
        { personId: 'b', percent: 0 }
      ]
    });
    expect(result).toEqual({ error: expect.any(String) });
  });

  it('tolerates tiny float drift in the percent sum', () => {
    const result = resolveSplits(300, {
      method: 'percent',
      shares: [
        { personId: 'a', percent: 33.33 },
        { personId: 'b', percent: 33.33 },
        { personId: 'c', percent: 33.34 }
      ]
    });
    expect(result).not.toHaveProperty('error');
    const total = (result as { amountCents: number }[]).reduce((sum, s) => sum + s.amountCents, 0);
    expect(total).toBe(300);
  });
});

describe('resolveSplits — custom', () => {
  it('accepts custom dollar amounts that sum exactly to the total', () => {
    const result = resolveSplits(1000, {
      method: 'custom',
      shares: [
        { personId: 'a', amount: 6 },
        { personId: 'b', amount: 4 }
      ]
    });
    expect(result).toEqual([
      { personId: 'a', amountCents: 600, percentAtEntry: null },
      { personId: 'b', amountCents: 400, percentAtEntry: null }
    ]);
  });

  it('rejects custom amounts that do not sum to the total', () => {
    const result = resolveSplits(1000, {
      method: 'custom',
      shares: [
        { personId: 'a', amount: 6 },
        { personId: 'b', amount: 3 }
      ]
    });
    expect(result).toEqual({ error: expect.any(String) });
  });

  it('rejects a zero or negative custom amount', () => {
    const result = resolveSplits(1000, {
      method: 'custom',
      shares: [
        { personId: 'a', amount: 10 },
        { personId: 'b', amount: 0 }
      ]
    });
    expect(result).toEqual({ error: expect.any(String) });
  });
});
