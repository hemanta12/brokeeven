// The API validates against its own copy of this list
// (apps/api/src/split/money.ts) and stays the source of truth; this duplicate
// only powers the picker and the locale default.
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

// Locale currency if it's in the allowlist, else USD. Picker default and the
// fieldless Quick 1:1 flow.
export function localeCurrency(): string {
  try {
    const code = new Intl.NumberFormat().resolvedOptions().currency;
    return code && (SUPPORTED_CURRENCIES as readonly string[]).includes(code) ? code : 'USD';
  } catch {
    return 'USD';
  }
}

// Bare symbol for a code ("$", "€", "₹"), for input adornments where a full
// formatted figure would be wrong. Falls back to the code itself.
const currencySymbols = new Map<string, string>();

export function currencySymbol(currency: string): string {
  let symbol = currencySymbols.get(currency);
  if (symbol === undefined) {
    try {
      const parts = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol'
      }).formatToParts(0);
      symbol = parts.find((part) => part.type === 'currency')?.value ?? currency;
    } catch {
      symbol = currency;
    }
    currencySymbols.set(currency, symbol);
  }
  return symbol;
}

// One formatter per currency code, cached. USD default keeps non-group figures
// (e.g. the marketing counter) working without a code.
const currencyFormatters = new Map<string, Intl.NumberFormat>();

function currencyFormatterFor(currency: string): Intl.NumberFormat {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });
    currencyFormatters.set(currency, formatter);
  }
  return formatter;
}
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});
// Group headings: no year (see formatDateGroupLabel for the fallback).
const groupDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric'
});

// "Updated" lines: no weekday (noise on a last-touched date).
const shortDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const shortDateWithYearFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

// The API serializes `date` (@db.Date) as an ISO string at UTC midnight; only
// the calendar portion is meaningful. Parsing the whole string via `new Date()`
// resolves it as an instant, rendering as the previous day west of UTC.
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

function parseCalendarDate(date: string): Date {
  const parts = CALENDAR_DATE.exec(date);
  return parts
    ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
    : new Date(date);
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return currencyFormatterFor(currency).format(amount);
}

export function formatExpenseTitle(title: string): string {
  if (!title) return '';
  return `${title.charAt(0).toUpperCase()}${title.slice(1).toLowerCase()}`;
}

// Capitalizes the first letter only, leaving the rest so "McKay" and "de Souza"
// survive (unlike formatExpenseTitle).
export function capitalizeFirst(text: string): string {
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
}

export function formatDate(date: string | Date): string {
  return dateFormatter.format(typeof date === 'string' ? parseCalendarDate(date) : date);
}

// Day heading: carries the year only when it isn't the current one. `today` is
// injectable so that branch is testable without freezing the clock.
export function formatDateGroupLabel(date: string, today: Date = new Date()): string {
  const parsed = parseCalendarDate(date);
  return parsed.getFullYear() === today.getFullYear()
    ? groupDateFormatter.format(parsed)
    : dateFormatter.format(parsed);
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// "Updated" label for My Groups. `date` is a full ISO instant here (not a
// @db.Date), so it's compared by local calendar day.
export function formatUpdatedLabel(date: string, now: Date = new Date()): string {
  const parsed = new Date(date);
  const days = Math.round((startOfLocalDay(now) - startOfLocalDay(parsed)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return parsed.getFullYear() === now.getFullYear()
    ? shortDateFormatter.format(parsed)
    : shortDateWithYearFormatter.format(parsed);
}
