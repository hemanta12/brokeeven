import { describe, expect, it } from 'vitest';

import { cleanAmountInput, dateTileParts, parsePastedAmount, todayIsoDate } from './expenseForm';

describe('cleanAmountInput', () => {
  it.each([
    ['-5', '5'],
    ['abc12', '12'],
    ['1.2.3', '1.23'],
    ['12.345', '12.34'],
    ['123456789.999', '12345678.99'],
    ['', ''],
    ['.5', '.5'],
    ['20.', '20.']
  ])('%j -> %j', (raw, expected) => {
    expect(cleanAmountInput(raw)).toBe(expected);
  });
});

describe('parsePastedAmount', () => {
  it('strips the currency symbol and thousands separators', () => {
    expect(parsePastedAmount(' $1,234.50 ', '$')).toBe('1234.50');
  });

  it.each(['1e5', '-5', '12abc', '', '.', '1 2 x'])('refuses %j', (text) => {
    expect(parsePastedAmount(text, '$')).toBeNull();
  });
});

describe('todayIsoDate', () => {
  it('uses the local calendar day, not UTC', () => {
    // 22:30 local on Oct 30 is already Oct 31 in UTC for any zone behind it.
    expect(todayIsoDate(new Date(2026, 9, 30, 22, 30))).toBe('2026-10-30');
  });
});

describe('dateTileParts', () => {
  const now = new Date(2026, 9, 30);

  it('splits an ISO date and omits the current year', () => {
    expect(dateTileParts('2026-10-05', now)).toEqual({ day: '5', month: 'Oct', year: null });
  });

  it('shows the year when it is not the current one', () => {
    expect(dateTileParts('2025-12-31', now)).toEqual({ day: '31', month: 'Dec', year: '2025' });
  });

  it('returns null for an empty or malformed date', () => {
    expect(dateTileParts('', now)).toBeNull();
    expect(dateTileParts('2026-13-45', now)).toBeNull();
  });
});
