import { formatCurrency, formatExpenseTitle } from '../shared/format';

interface ExpenseRowProps {
  title: string;
  payerName: string;
  payerIsViewer?: boolean;
  amount: number;
  onClick: () => void;
}

// Card contents for one expense (DESIGN_SYSTEM.md §7). Three tiers: the title
// and the amount are the two anchors you scan for, so they carry the weight —
// title in Semibold sans, amount in Medium mono. Who paid is supporting detail
// at label size, and the date sits on the day heading above the list, not on
// every card. The card surface, hover and press live on the wrapping <li> (see
// .entry-card) so the .row-pulse cue isn't painted over.
export function ExpenseRow({ title, payerName, payerIsViewer = false, amount, onClick }: ExpenseRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring flex min-h-11 w-full items-center justify-between gap-4 rounded-[10px] px-4 py-2 text-left"
    >
      {/* min-w-0 lets the truncation below actually engage — without it the
          flex item refuses to shrink past its content's intrinsic width. */}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-body font-semibold text-ink-forest">
          {formatExpenseTitle(title)}
        </span>
        {/* "paid" carries real meaning here: a lone name next to an amount
            reads equally as who owes it. */}
        <span className="mt-0.5 block truncate font-sans text-label text-ink-forest/70">
          {payerIsViewer ? 'You' : payerName} paid
        </span>
      </span>
      <span className="shrink-0 font-sans text-row-amount font-medium tabular-nums text-ink-forest">
        {formatCurrency(amount)}
      </span>
    </button>
  );
}
