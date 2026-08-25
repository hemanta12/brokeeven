import { describe, expect, it } from 'vitest';

import { groupExpensesByDate } from './expenseGroups';
import type { Expense } from './types';

function expense(id: string, date: string, amount: string): Expense {
  return {
    id,
    groupId: 'g1',
    title: id,
    description: null,
    amount,
    date,
    payerId: 'p1',
    splitMethod: 'equal',
    splits: []
  } as Expense;
}

describe('groupExpensesByDate', () => {
  it('buckets by calendar day, keeping the order the API sent', () => {
    const groups = groupExpensesByDate([
      expense('a', '2026-08-24T00:00:00.000Z', '100.00'),
      expense('b', '2026-08-24T00:00:00.000Z', '18.00'),
      expense('c', '2026-08-22T00:00:00.000Z', '42.50')
    ]);

    expect(groups.map((g) => g.date)).toEqual(['2026-08-24', '2026-08-22']);
    expect(groups[0]!.expenses.map((e) => e.id)).toEqual(['a', 'b']);
    expect(groups[1]!.expenses).toHaveLength(1);
  });

  // The API sends `@db.Date` as a full ISO timestamp, so the day key has to be
  // taken from the calendar portion rather than the whole string.
  it('buckets a bare date and a full timestamp on the same day together', () => {
    const groups = groupExpensesByDate([
      expense('a', '2026-08-24T00:00:00.000Z', '0.10'),
      expense('b', '2026-08-24', '0.20')
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.date).toBe('2026-08-24');
  });

  it('returns nothing for an empty list', () => {
    expect(groupExpensesByDate([])).toEqual([]);
  });
});
