import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { monthIndex } from './expensePeriod';
import type { Expense } from './types';
import { useExpensePeriod } from './useExpensePeriod';

const expense = (id: string, date: string) => ({ id, date }) as unknown as Expense;
const EXPENSES = [expense('a', '2026-10-29'), expense('b', '2026-09-05'), expense('c', '2025-12-20')];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 29, 12));
});
afterEach(() => vi.useRealTimers());

describe('useExpensePeriod', () => {
  it('opens on this month, not All time', () => {
    const { result } = renderHook(() => useExpensePeriod(EXPENSES));

    expect(result.current.period).toEqual({ kind: 'month', index: monthIndex(2026, 9) });
    expect(result.current.label).toBe('Oct 2026');
    expect(result.current.filtered.map((e) => e.id)).toEqual(['a']);
  });

  it('opens on an empty list when this month has no expenses, rather than falling back', () => {
    const { result } = renderHook(() => useExpensePeriod([expense('c', '2025-12-20')]));

    expect(result.current.filtered).toEqual([]);
    expect(result.current.period.kind).toBe('month');
  });

  it('filters by whatever period is set', () => {
    const { result } = renderHook(() => useExpensePeriod(EXPENSES));

    act(() => result.current.setPeriod({ kind: 'all' }));
    expect(result.current.filtered).toHaveLength(3);

    act(() => result.current.setPeriod({ kind: 'year', year: 2025 }));
    expect(result.current.filtered.map((e) => e.id)).toEqual(['c']);
  });

  it('re-derives from a replaced expense list (realtime) without touching the period', () => {
    const { result, rerender } = renderHook(({ list }) => useExpensePeriod(list), {
      initialProps: { list: EXPENSES }
    });

    rerender({ list: [...EXPENSES, expense('d', '2026-10-30')] });

    expect(result.current.filtered.map((e) => e.id)).toEqual(['a', 'd']);
  });

  it('exposes the stepping span and the selectable years', () => {
    const { result } = renderHook(() => useExpensePeriod(EXPENSES));

    expect(result.current.bounds).toEqual({ min: monthIndex(2025, 11), max: monthIndex(2026, 9) });
    expect(result.current.years).toEqual([2026, 2025]);
  });
});
