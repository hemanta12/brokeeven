import { describe, expect, it } from 'vitest';

import { canEdit, resolveIdentityPersonId, viewerNetOnExpense } from './ownership';

describe('canEdit', () => {
  it('leaves rows with no recorded creator open to everyone', () => {
    expect(canEdit(null, null)).toBe(true);
    expect(canEdit(null, 'u1')).toBe(true);
  });

  it('lets the creator edit their own row', () => {
    expect(canEdit('u1', 'u1')).toBe(true);
  });

  it("hides the affordance on someone else's row", () => {
    expect(canEdit('u1', 'u2')).toBe(false);
  });

  it('hides it from a viewer the server could not identify', () => {
    expect(canEdit('u1', null)).toBe(false);
  });
});

describe('resolveIdentityPersonId', () => {
  const people = [
    { id: 'p1', paymentHandle: null, userId: null },
    { id: 'p2', userId: 'u1' }
  ];

  it("prefers the account's claim over this browser's hint", () => {
    // The claim followed the viewer here from another device; the local hint
    // is whatever this browser happened to remember.
    expect(resolveIdentityPersonId(people, 'u1', 'p1')).toBe('p2');
  });

  it('falls back to the local hint when the viewer has claimed nobody', () => {
    expect(resolveIdentityPersonId(people, 'u9', 'p1')).toBe('p1');
  });

  it('uses the local hint for an unidentified viewer', () => {
    expect(resolveIdentityPersonId(people, null, 'p1')).toBe('p1');
  });

  it('returns null when neither source knows', () => {
    expect(resolveIdentityPersonId(people, null, null)).toBeNull();
  });
});

describe('viewerNetOnExpense', () => {
  const expense = (payerId: string, amount: string, splits: [string, string][]) => ({
    payerId,
    amount,
    splits: splits.map(([personId, splitAmount]) => ({ personId, amount: splitAmount }))
  });

  it('is null until the viewer says which person they are', () => {
    expect(viewerNetOnExpense(expense('p1', '90.00', [['p1', '45.00'], ['p2', '45.00']]), null)).toBeNull();
  });

  it('is what you paid minus your share when you paid', () => {
    expect(viewerNetOnExpense(expense('p1', '90.00', [['p1', '30.00'], ['p2', '60.00']]), 'p1')).toBe(60);
  });

  it('is negative your share when someone else paid', () => {
    expect(viewerNetOnExpense(expense('p2', '90.00', [['p1', '30.00'], ['p2', '60.00']]), 'p1')).toBe(-30);
  });

  it('is the whole amount when you paid and are not in the split', () => {
    expect(viewerNetOnExpense(expense('p1', '90.00', [['p2', '90.00']]), 'p1')).toBe(90);
  });

  // Not "even": the expense simply is not the viewer's, which is why the row
  // captions this case differently from a settled one.
  it('is zero when someone else paid and you are not in the split', () => {
    expect(viewerNetOnExpense(expense('p2', '90.00', [['p3', '90.00']]), 'p1')).toBe(0);
  });
});
