import type { Expense } from './types';

export interface ExpenseDateGroup {
  /** Leading `YYYY-MM-DD` of the day's expenses. */
  date: string;
  expenses: Expense[];
}

// Buckets by calendar day, preserving input order — the API sorts `date: 'desc'`,
// so groups come out newest-first without a second sort.
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
