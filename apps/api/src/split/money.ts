export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function centsToAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Curated allowlist, not the full ISO 4217 table. Unknown codes are rejected,
// never stored as free text. ponytail: widen the array if users ask.
export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'INR',
  'NPR',
  'SGD',
  'AED'
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

const moneyFormatters = new Map<string, Intl.NumberFormat>();

// Mirrors the web `formatCurrency` — both go through Intl so USD output stays
// exactly "$20.00", leaving the existing activity-log format unchanged.
export function formatMoney(cents: number, currency: string): string {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });
    moneyFormatters.set(currency, formatter);
  }
  return formatter.format(cents / 100);
}
