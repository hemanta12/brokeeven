import { describe, expect, it } from 'vitest';

import { checkOverpayment } from './overpayment';
import type { Balance } from '../group/types';

const BOB = 'p-bob';
const ALICE = 'p-alice';
const BALANCES: Balance[] = [{ fromPersonId: BOB, toPersonId: ALICE, amount: '66.67' }];

describe('checkOverpayment', () => {
  it('says nothing about a partial settlement', () => {
    expect(checkOverpayment(BALANCES, BOB, ALICE, '30')).toBeNull();
  });

  it('says nothing about settling the exact balance', () => {
    expect(checkOverpayment(BALANCES, BOB, ALICE, '66.67')).toBeNull();
  });

  // The case the guard exists for: a misplaced decimal point.
  it('flags the missing-decimal-point typo with the debt it would create', () => {
    expect(checkOverpayment(BALANCES, BOB, ALICE, '6667')).toEqual({
      owed: 66.67,
      excess: 6600.33,
    });
  });

  it('treats a pair with no balance as owing nothing', () => {
    expect(checkOverpayment(BALANCES, ALICE, BOB, '10')).toEqual({ owed: 0, excess: 10 });
  });

  // Direction is not symmetric: Bob owing Alice says nothing about what
  // Alice owes Bob, so swapping From/To must re-derive rather than reuse.
  it('does not treat the reverse direction as the same balance', () => {
    expect(checkOverpayment(BALANCES, ALICE, BOB, '66.67')).toEqual({ owed: 0, excess: 66.67 });
  });

  it('ignores an empty or unparseable amount', () => {
    expect(checkOverpayment(BALANCES, BOB, ALICE, '')).toBeNull();
    expect(checkOverpayment(BALANCES, BOB, ALICE, 'abc')).toBeNull();
    expect(checkOverpayment(BALANCES, BOB, ALICE, '0')).toBeNull();
  });

  // Cents throughout: 0.1 + 0.2 arithmetic must not manufacture a warning.
  it('does not warn from floating-point drift at the exact balance', () => {
    const drifty: Balance[] = [{ fromPersonId: BOB, toPersonId: ALICE, amount: '0.30' }];
    expect(checkOverpayment(drifty, BOB, ALICE, '0.3')).toBeNull();
  });
});
