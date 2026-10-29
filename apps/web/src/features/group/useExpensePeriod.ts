import { useMemo, useState } from 'react';

import {
  currentMonthIndex,
  filterByPeriod,
  periodBounds,
  periodLabel,
  selectableYears,
  type Period
} from './expensePeriod';
import type { Expense } from './types';

// Filter state is only the chosen period; the filtered list is derived from
// `expenses` every render, so a realtime replacement of the cache flows through.
// Opens on the current month and resets on every load (nothing is persisted).
export function useExpensePeriod(expenses: Expense[]) {
  const [thisMonth] = useState(currentMonthIndex);
  const [period, setPeriod] = useState<Period>(() => ({ kind: 'month', index: thisMonth }));

  const filtered = useMemo(() => filterByPeriod(expenses, period), [expenses, period]);
  const dates = useMemo(() => expenses.map((expense) => expense.date), [expenses]);
  const bounds = useMemo(() => periodBounds(dates, thisMonth), [dates, thisMonth]);
  const years = useMemo(() => selectableYears(dates, thisMonth), [dates, thisMonth]);

  return { period, setPeriod, thisMonth, bounds, years, filtered, label: periodLabel(period) };
}
