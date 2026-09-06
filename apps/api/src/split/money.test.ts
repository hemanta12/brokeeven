import { describe, expect, it } from 'vitest';

import { formatMoney, isSupportedCurrency, SUPPORTED_CURRENCIES } from './money.js';

describe('isSupportedCurrency', () => {
  it('accepts every code in the allowlist', () => {
    for (const code of SUPPORTED_CURRENCIES) {
      expect(isSupportedCurrency(code)).toBe(true);
    }
  });

  it('rejects unknown codes, free text, and non-strings', () => {
    expect(isSupportedCurrency('XXX')).toBe(false);
    expect(isSupportedCurrency('usd')).toBe(false);
    expect(isSupportedCurrency('rupees')).toBe(false);
    expect(isSupportedCurrency(undefined)).toBe(false);
    expect(isSupportedCurrency(840)).toBe(false);
  });
});

describe('formatMoney', () => {
  it('keeps USD exactly as the old hardcoded format', () => {
    expect(formatMoney(2000, 'USD')).toBe('$20.00');
    expect(formatMoney(1234567, 'USD')).toBe('$12,345.67');
  });

  it('formats other supported currencies with their own symbol/code', () => {
    expect(formatMoney(2000, 'EUR')).toBe('€20.00');
    expect(formatMoney(2000, 'GBP')).toBe('£20.00');
    expect(formatMoney(2000, 'INR')).toBe('₹20.00');
    // JPY has no minor unit — Intl drops the decimals.
    expect(formatMoney(2000, 'JPY')).toBe('¥20');
    expect(formatMoney(200000, 'NPR')).toContain('2,000');
  });
});
