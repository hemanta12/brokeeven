import { describe, expect, it } from 'vitest';

import { computeBalances } from './balances.js';

describe('computeBalances', () => {
  it('nets a single two-person expense', () => {
    const result = computeBalances(
      [{ payerId: 'a', splits: [{ personId: 'b', amountCents: 500 }] }],
      []
    );
    expect(result).toEqual([{ fromPersonId: 'b', toPersonId: 'a', amountCents: 500 }]);
  });

  it('ignores the payer share on their own split row', () => {
    const result = computeBalances(
      [
        {
          payerId: 'a',
          splits: [
            { personId: 'a', amountCents: 500 },
            { personId: 'b', amountCents: 500 }
          ]
        }
      ],
      []
    );
    expect(result).toEqual([{ fromPersonId: 'b', toPersonId: 'a', amountCents: 500 }]);
  });

  it('accumulates multiple expenses between the same pair', () => {
    const result = computeBalances(
      [
        { payerId: 'a', splits: [{ personId: 'b', amountCents: 500 }] },
        { payerId: 'a', splits: [{ personId: 'b', amountCents: 300 }] }
      ],
      []
    );
    expect(result).toEqual([{ fromPersonId: 'b', toPersonId: 'a', amountCents: 800 }]);
  });

  it('reduces the balance after a settlement', () => {
    const result = computeBalances(
      [{ payerId: 'a', splits: [{ personId: 'b', amountCents: 1000 }] }],
      [{ fromPersonId: 'b', toPersonId: 'a', amountCents: 400 }]
    );
    expect(result).toEqual([{ fromPersonId: 'b', toPersonId: 'a', amountCents: 600 }]);
  });

  it('omits a pair that is fully settled', () => {
    const result = computeBalances(
      [{ payerId: 'a', splits: [{ personId: 'b', amountCents: 1000 }] }],
      [{ fromPersonId: 'b', toPersonId: 'a', amountCents: 1000 }]
    );
    expect(result).toEqual([]);
  });

  it('flips the direction when a settlement overpays', () => {
    const result = computeBalances(
      [{ payerId: 'a', splits: [{ personId: 'b', amountCents: 1000 }] }],
      [{ fromPersonId: 'b', toPersonId: 'a', amountCents: 1500 }]
    );
    expect(result).toEqual([{ fromPersonId: 'a', toPersonId: 'b', amountCents: 500 }]);
  });

  it('nets cross-expense debts between three people independently per pair', () => {
    const result = computeBalances(
      [
        { payerId: 'a', splits: [{ personId: 'b', amountCents: 600 }, { personId: 'c', amountCents: 400 }] },
        { payerId: 'c', splits: [{ personId: 'a', amountCents: 200 }] }
      ],
      []
    );
    expect(result).toEqual(
      expect.arrayContaining([
        { fromPersonId: 'b', toPersonId: 'a', amountCents: 600 },
        { fromPersonId: 'c', toPersonId: 'a', amountCents: 200 }
      ])
    );
    expect(result).toHaveLength(2);
  });

  it('returns an empty array with no expenses or settlements', () => {
    expect(computeBalances([], [])).toEqual([]);
  });
});
