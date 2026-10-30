import { describe, expect, it } from 'vitest';

import {
  ALL_TIME,
  compactMonthLabel,
  currentMonthIndex,
  draftFromPeriod,
  filterByPeriod,
  monthIndex,
  monthIndexOfDate,
  periodBounds,
  periodLabel,
  periodIncludes,
  pickRangeMonth,
  rangeToPeriod,
  selectableYears,
  stepMonth,
  type Period
} from './expensePeriod';

const OCT_26 = monthIndex(2026, 9);
const month = (index: number): Period => ({ kind: 'month', index });

describe('month indexes', () => {
  it('reads the calendar month straight from an ISO date, ignoring time zone', () => {
    expect(monthIndexOfDate('2026-10-05')).toBe(OCT_26);
    expect(monthIndexOfDate('2026-10-31T23:30:00.000Z')).toBe(OCT_26);
    expect(monthIndexOfDate('2026-01-01')).toBe(monthIndex(2026, 0));
  });

  it('derives the current month from a Date', () => {
    expect(currentMonthIndex(new Date(2026, 9, 29))).toBe(OCT_26);
  });
});

describe('periodIncludes / filterByPeriod', () => {
  const items = [
    { date: '2026-10-29' },
    { date: '2026-09-05' },
    { date: '2026-08-14' },
    { date: '2025-12-20' }
  ];

  it('matches a single month, a year, and a month-to-month range inclusively', () => {
    expect(filterByPeriod(items, month(OCT_26))).toEqual([items[0]]);
    expect(filterByPeriod(items, { kind: 'year', year: 2026 })).toHaveLength(3);
    expect(filterByPeriod(items, { kind: 'range', from: monthIndex(2026, 7), to: OCT_26 })).toHaveLength(3);
  });

  it('keeps everything for all time and returns the same array', () => {
    expect(filterByPeriod(items, ALL_TIME)).toBe(items);
    expect(periodIncludes(ALL_TIME, '1999-01-01')).toBe(true);
  });

  it('is empty for a month with no expenses', () => {
    expect(filterByPeriod(items, month(monthIndex(2026, 6)))).toEqual([]);
  });
});

describe('compactMonthLabel', () => {
  it('drops this year and shortens any other year', () => {
    expect(compactMonthLabel(OCT_26, OCT_26)).toBe('Oct');
    expect(compactMonthLabel(monthIndex(2025, 8), OCT_26)).toBe("Sep '25");
  });
});

describe('periodLabel', () => {
  it('names each kind of period', () => {
    expect(periodLabel(ALL_TIME)).toBe('All time');
    expect(periodLabel(month(OCT_26))).toBe('Oct 2026');
    expect(periodLabel({ kind: 'year', year: 2025 })).toBe('2025');
  });

  it('collapses the year inside a range only when both ends share it', () => {
    expect(periodLabel({ kind: 'range', from: monthIndex(2026, 7), to: OCT_26 })).toBe('Aug – Oct 2026');
    expect(periodLabel({ kind: 'range', from: monthIndex(2025, 11), to: monthIndex(2026, 1) })).toBe(
      'Dec 2025 – Feb 2026'
    );
  });
});

describe('periodBounds / selectableYears', () => {
  const dates = ['2026-10-29', '2025-12-20'];

  it('spans the earliest expense to this month', () => {
    expect(periodBounds(dates, OCT_26)).toEqual({ min: monthIndex(2025, 11), max: OCT_26 });
  });

  it('is just this month when there are no expenses, and reaches a later-dated expense', () => {
    expect(periodBounds([], OCT_26)).toEqual({ min: OCT_26, max: OCT_26 });
    expect(periodBounds(['2026-12-01'], OCT_26).max).toBe(monthIndex(2026, 11));
  });

  it('lists this year first, then earlier years that have expenses', () => {
    expect(selectableYears(dates, OCT_26)).toEqual([2026, 2025]);
    expect(selectableYears([], OCT_26)).toEqual([2026]);
    expect(selectableYears(['2024-03-01'], OCT_26)).toEqual([2026, 2024]);
  });
});

describe('stepMonth', () => {
  const bounds = { min: monthIndex(2025, 11), max: OCT_26 };

  it('moves one month either way, across a year boundary', () => {
    expect(stepMonth(month(monthIndex(2026, 0)), -1, bounds)).toEqual(month(monthIndex(2025, 11)));
    expect(stepMonth(month(monthIndex(2026, 8)), 1, bounds)).toEqual(month(OCT_26));
  });

  it('stops at both ends of the span', () => {
    expect(stepMonth(month(bounds.min), -1, bounds)).toBeNull();
    expect(stepMonth(month(bounds.max), 1, bounds)).toBeNull();
  });

  it('only steps a single month', () => {
    expect(stepMonth(ALL_TIME, 1, bounds)).toBeNull();
    expect(stepMonth({ kind: 'year', year: 2026 }, 1, bounds)).toBeNull();
    expect(stepMonth({ kind: 'range', from: 1, to: 2 }, 1, bounds)).toBeNull();
  });
});

describe('custom range drafting', () => {
  it('seeds from the current period, or the last three months', () => {
    expect(draftFromPeriod(month(OCT_26), OCT_26)).toEqual({ from: OCT_26, to: OCT_26, picking: 'from' });
    expect(draftFromPeriod({ kind: 'range', from: 3, to: 5 }, OCT_26)).toEqual({ from: 3, to: 5, picking: 'from' });
    expect(draftFromPeriod(ALL_TIME, OCT_26)).toEqual({ from: OCT_26 - 2, to: OCT_26, picking: 'from' });
  });

  it('alternates From then To', () => {
    const afterFrom = pickRangeMonth({ from: 5, to: 8, picking: 'from' }, 6);
    expect(afterFrom).toEqual({ from: 6, to: 8, picking: 'to' });
    expect(pickRangeMonth(afterFrom, 10)).toEqual({ from: 6, to: 10, picking: 'from' });
  });

  it('drags To along when From is picked past it', () => {
    expect(pickRangeMonth({ from: 5, to: 8, picking: 'from' }, 12)).toEqual({ from: 12, to: 12, picking: 'to' });
  });

  it('swaps instead of inverting when To is picked before From', () => {
    expect(pickRangeMonth({ from: 6, to: 8, picking: 'to' }, 3)).toEqual({ from: 3, to: 6, picking: 'from' });
  });

  it('turns a one-month range into a month period', () => {
    expect(rangeToPeriod(4, 4)).toEqual({ kind: 'month', index: 4 });
    expect(rangeToPeriod(4, 6)).toEqual({ kind: 'range', from: 4, to: 6 });
  });
});
