// Months are counted as `year * 12 + month0` so ranges and stepping are plain
// integer maths with no Date arithmetic (and no time-zone drift).
export type Period =
  | { kind: 'all' }
  | { kind: 'month'; index: number }
  | { kind: 'year'; year: number }
  | { kind: 'range'; from: number; to: number };

export const ALL_TIME: Period = { kind: 'all' };

export interface PeriodBounds {
  min: number;
  max: number;
}

export function monthIndex(year: number, month0: number): number {
  return year * 12 + month0;
}

export function yearOf(index: number): number {
  return Math.floor(index / 12);
}

export function currentMonthIndex(now: Date = new Date()): number {
  return monthIndex(now.getFullYear(), now.getMonth());
}

// Expense dates are ISO strings ("2026-10-05" or a full timestamp); the calendar
// day is the first ten characters, read as written rather than through a Date.
export function monthIndexOfDate(date: string): number {
  return monthIndex(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1);
}

export function periodIncludes(period: Period, date: string): boolean {
  const index = monthIndexOfDate(date);
  switch (period.kind) {
    case 'all':
      return true;
    case 'month':
      return index === period.index;
    case 'year':
      return yearOf(index) === period.year;
    case 'range':
      return index >= period.from && index <= period.to;
  }
}

export function filterByPeriod<T extends { date: string }>(items: T[], period: Period): T[] {
  return period.kind === 'all' ? items : items.filter((item) => periodIncludes(period, item.date));
}

const MONTH_NAME = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

export function monthName(index: number): string {
  return MONTH_NAME.format(new Date(Date.UTC(yearOf(index), index % 12, 1)));
}

export function monthLabel(index: number): string {
  return `${monthName(index)} ${yearOf(index)}`;
}

// The pill between the month arrows sits in the ring's narrow column, so it drops
// this year's year and shortens any other year: "Oct", "Sep '25".
export function compactMonthLabel(index: number, thisMonth: number): string {
  return yearOf(index) === yearOf(thisMonth)
    ? monthName(index)
    : `${monthName(index)} '${String(yearOf(index)).slice(-2)}`;
}

export function periodLabel(period: Period): string {
  switch (period.kind) {
    case 'all':
      return 'All time';
    case 'month':
      return monthLabel(period.index);
    case 'year':
      return String(period.year);
    case 'range':
      return rangeLabel(period.from, period.to);
  }
}

export function rangeLabel(from: number, to: number): string {
  if (from === to) return monthLabel(from);
  return yearOf(from) === yearOf(to)
    ? `${monthName(from)} – ${monthName(to)} ${yearOf(to)}`
    : `${monthLabel(from)} – ${monthLabel(to)}`;
}

// The span the arrows and pickers may reach: the first expense's month through
// this month (or a later-dated expense, so nothing is stranded).
export function periodBounds(dates: string[], thisMonth: number): PeriodBounds {
  const indexes = dates.map(monthIndexOfDate).filter(Number.isFinite);
  return {
    min: indexes.length ? Math.min(thisMonth, ...indexes) : thisMonth,
    max: indexes.length ? Math.max(thisMonth, ...indexes) : thisMonth
  };
}

// Current year first, then earlier years that have expenses.
export function selectableYears(dates: string[], thisMonth: number): number[] {
  const years = new Set(dates.map((date) => yearOf(monthIndexOfDate(date))).filter(Number.isFinite));
  years.add(yearOf(thisMonth));
  return [...years].sort((a, b) => b - a);
}

// Arrows exist only for a single month; null at the ends of the span.
export function stepMonth(period: Period, delta: 1 | -1, bounds: PeriodBounds): Period | null {
  if (period.kind !== 'month') return null;
  const next = period.index + delta;
  return next < bounds.min || next > bounds.max ? null : { kind: 'month', index: next };
}

export interface RangeDraft {
  from: number;
  to: number;
  picking: 'from' | 'to';
}

// Seeds the custom range from what is already showing; from "All time" or a
// year it offers the last three months.
export function draftFromPeriod(period: Period, thisMonth: number): RangeDraft {
  if (period.kind === 'range') return { from: period.from, to: period.to, picking: 'from' };
  if (period.kind === 'month') return { from: period.index, to: period.index, picking: 'from' };
  return { from: thisMonth - 2, to: thisMonth, picking: 'from' };
}

// Tapping alternates From then To. Picking a From past To drags To along;
// picking a To before From swaps them, so the range is never inverted.
export function pickRangeMonth(draft: RangeDraft, index: number): RangeDraft {
  if (draft.picking === 'from') {
    return { from: index, to: Math.max(draft.to, index), picking: 'to' };
  }
  return index < draft.from
    ? { from: index, to: draft.from, picking: 'from' }
    : { from: draft.from, to: index, picking: 'from' };
}

export function rangeToPeriod(from: number, to: number): Period {
  return from === to ? { kind: 'month', index: from } : { kind: 'range', from, to };
}
