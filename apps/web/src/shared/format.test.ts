import { describe, expect, it } from 'vitest';

import {
  currencySymbol,
  formatCurrency,
  formatDate,
  formatDateGroupLabel,
  formatExpenseTitle,
  formatUpdatedLabel,
  localeCurrency
} from './format';

describe('formatCurrency', () => {
  it('defaults to USD and matches the pre-currency format', () => {
    expect(formatCurrency(20)).toBe('$20.00');
    expect(formatCurrency(12345.6)).toBe('$12,345.60');
  });

  it('formats a passed currency code with its own symbol', () => {
    expect(formatCurrency(20, 'EUR')).toBe('€20.00');
    expect(formatCurrency(20, 'NPR')).toContain('20.00');
    expect(formatCurrency(20, 'JPY')).toBe('¥20');
  });
});

describe('currencySymbol', () => {
  it('returns the bare symbol for common codes', () => {
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('GBP')).toBe('£');
    expect(currencySymbol('INR')).toBe('₹');
  });

  it('falls back to the code itself when Intl cannot resolve one', () => {
    expect(currencySymbol('ZZZ')).toBe('ZZZ');
  });
});

describe('localeCurrency', () => {
  it('returns a supported code or falls back to USD', () => {
    // The test env locale is unpredictable; only the contract is asserted.
    expect(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'NPR', 'SGD', 'AED']).toContain(
      localeCurrency()
    );
  });
});

describe('formatExpenseTitle', () => {
  it('normalizes all-uppercase and mixed-case titles', () => {
    expect(formatExpenseTitle('DINNER')).toBe('Dinner');
    expect(formatExpenseTitle('tAKE OUT')).toBe('Take out');
  });

  it('preserves the empty value', () => {
    expect(formatExpenseTitle('')).toBe('');
  });
});

describe('formatDate', () => {
  it('formats a date-only ISO value with an abbreviated weekday', () => {
    expect(formatDate('2026-01-05')).toBe('Mon, Jan 5, 2026');
  });

  // The API sends `@db.Date` as UTC midnight; resolving that as an instant
  // lands on the 4th for anyone west of UTC.
  it('keeps the calendar day of a full ISO timestamp', () => {
    expect(formatDate('2026-01-05T00:00:00.000Z')).toBe('Mon, Jan 5, 2026');
  });
});

describe('formatDateGroupLabel', () => {
  const today = new Date(2026, 7, 24);

  it('always reads as an actual date, including for today itself', () => {
    expect(formatDateGroupLabel('2026-08-24T00:00:00.000Z', today)).toBe('Mon, Aug 24');
    expect(formatDateGroupLabel('2026-08-23T00:00:00.000Z', today)).toBe('Sun, Aug 23');
  });

  it('drops the year within the current year and keeps it otherwise', () => {
    expect(formatDateGroupLabel('2026-08-22T00:00:00.000Z', today)).toBe('Sat, Aug 22');
    expect(formatDateGroupLabel('2025-12-31T00:00:00.000Z', today)).toBe('Wed, Dec 31, 2025');
  });
});

describe('formatUpdatedLabel', () => {
  const now = new Date(2026, 7, 24, 15, 0);
  // Local-noon instant, so the runner's timezone can't shift the calendar day.
  const at = (year: number, month: number, day: number) =>
    new Date(year, month, day, 12, 0).toISOString();

  it('says today and yesterday for the two recent days', () => {
    expect(formatUpdatedLabel(at(2026, 7, 24), now)).toBe('today');
    expect(formatUpdatedLabel(at(2026, 7, 23), now)).toBe('yesterday');
  });

  it('falls back to a weekday-less short date beyond yesterday', () => {
    expect(formatUpdatedLabel(at(2026, 7, 22), now)).toBe('Aug 22');
    expect(formatUpdatedLabel(at(2025, 11, 31), now)).toBe('Dec 31, 2025');
  });

  it('treats a future timestamp as today rather than a negative count', () => {
    expect(formatUpdatedLabel(at(2026, 7, 25), now)).toBe('today');
  });
});
