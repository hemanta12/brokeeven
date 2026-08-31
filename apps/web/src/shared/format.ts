const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});
// Group headings drop the year — it's redundant on the common case — and fall
// back to the full formatter above when the date isn't in the current year.
const groupDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric'
});

// The API stores `date` as `DateTime @db.Date` and serializes it as a full ISO
// string at UTC midnight ("2026-01-05T00:00:00.000Z"), so only the leading
// calendar portion carries meaning. Deliberately unanchored at the end: handing
// the whole ISO string to `new Date()` resolves it as an instant, which renders
// as the previous day for every viewer west of UTC.
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

// First letter only. For person names and name-initial sentences (the activity
// log), where a lowercase start looks like a bug. Unlike formatExpenseTitle it
// leaves the rest alone so "McKay" and "de Souza" survive.
export function capitalizeFirst(text: string): string {
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
}

export function formatDate(date: string | Date): string {
  return dateFormatter.format(typeof date === 'string' ? parseCalendarDate(date) : date);
}

// Heading for a day's worth of expenses. Always an actual date — the year is
// carried only when it isn't the current one, since it's noise on the common
// case and load-bearing on an old group. `today` is injectable so that branch
// is testable without freezing the clock.
export function formatDateGroupLabel(date: string, today: Date = new Date()): string {
  const parsed = parseCalendarDate(date);
  return parsed.getFullYear() === today.getFullYear()
    ? groupDateFormatter.format(parsed)
    : dateFormatter.format(parsed);
}
