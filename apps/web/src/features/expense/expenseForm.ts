const MAX_WHOLE_DIGITS = 8;

// Local calendar date, not toISOString(): that is UTC, so an evening in the
// Americas would default the date to tomorrow.
export function todayIsoDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// Digits and a single decimal point only: no sign, letters or exponent, at most
// two decimals and eight whole digits (the API caps the amount well above that).
export function cleanAmountInput(raw: string): string {
  const stripped = raw.replace(/[^\d.]/g, '');
  const dot = stripped.indexOf('.');
  if (dot === -1) return stripped.slice(0, MAX_WHOLE_DIGITS);
  const whole = stripped.slice(0, dot).slice(0, MAX_WHOLE_DIGITS);
  const fraction = stripped.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  return `${whole}.${fraction}`;
}

// A paste is accepted only if it is a plain number once the currency symbol and
// thousands separators are removed. Anything else ("1e5", "-5", "12abc") is
// refused whole rather than cleaned, so "1e5" never silently becomes 15.
export function parsePastedAmount(text: string, symbol: string): string | null {
  const trimmed = text.trim().split(symbol).join('').replace(/[,\s]/g, '');
  if (trimmed === '' || !/^\d*\.?\d*$/.test(trimmed) || trimmed === '.') return null;
  return cleanAmountInput(trimmed);
}

export interface DateTileParts {
  day: string;
  month: string;
  // Only when it isn't the current year, so a back-dated entry can't hide it.
  year: string | null;
}

export function dateTileParts(iso: string, now: Date = new Date()): DateTileParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const instant = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC rolls 2026-13-45 over into a valid date instead of rejecting it.
  if (instant.getUTCFullYear() !== year || instant.getUTCMonth() !== month - 1 || instant.getUTCDate() !== day) return null;
  return {
    day: String(day),
    month: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(instant),
    year: year === now.getFullYear() ? null : String(year)
  };
}
