const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
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

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
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
