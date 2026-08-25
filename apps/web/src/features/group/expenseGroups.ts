import type { Expense } from './types';

export interface ExpenseDateGroup {
  /** Leading `YYYY-MM-DD` of the day's expenses, used as the React key. */
  date: string;
  expenses: Expense[];
}

// Buckets expenses into calendar days, preserving the order they arrive in —
// the API already sorts them `date: 'desc'`, so the groups come out newest
// first without a second sort here.
export function groupExpensesByDate(expenses: Expense[]): ExpenseDateGroup[] {
  const groups = new Map<string, ExpenseDateGroup>();
  for (const expense of expenses) {
    const date = expense.date.slice(0, 10);
    const group = groups.get(date) ?? { date, expenses: [] };
    group.expenses.push(expense);
    groups.set(date, group);
  }
  return [...groups.values()];
}
