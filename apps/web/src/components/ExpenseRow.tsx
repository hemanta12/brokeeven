import { formatCurrency, formatDate } from '../shared/format';

interface ExpenseRowProps {
  title: string;
  payerName: string;
  amount: number;
  date: string;
  onClick: () => void;
}

// Title + payer left, amount right (DESIGN_SYSTEM.md §7). Renders the
// tappable row content only — the caller owns the wrapping <li> (key, and
// the .row-pulse real-time cue class), matching GroupPage's existing list.
export function ExpenseRow({ title, payerName, amount, date, onClick }: ExpenseRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring flex min-h-11 w-full items-center justify-between gap-4 px-2 py-3 text-left"
    >
      <span className="font-sans text-body text-ink-forest">
        {title} <span className="text-label text-ink-forest/70">— {payerName}</span>
        <span className="block text-label text-ink-forest/70">{formatDate(date)}</span>
      </span>
      <span className="shrink-0 font-mono text-row-amount tabular-nums text-ink-forest">
        {formatCurrency(amount)}
      </span>
    </button>
  );
}
