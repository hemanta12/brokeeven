import { formatExpenseTitle } from '../shared/format';
import { Amount } from './Amount';
import { Avatar } from './Avatar';

interface ExpenseRowProps {
  title: string;
  payerName: string;
  payerIsViewer?: boolean;
  amount: number;
  // The expense's effect on the viewer's balance (paid minus owed). Null when no
  // person is claimed, so only the total can be shown.
  viewerNet?: number | null;
  onClick: () => void;
}

function captionFor(net: number): string {
  if (net > 0) return 'you’re owed';
  if (net < 0) return 'you owe';
  return 'not yours';
}

// Card contents for one expense: the total, plus the viewer's own position when
// a person is claimed (its caption keeps direction off colour alone). Card
// surface, hover and press live on the wrapping <li> (.entry-card) so the
// .row-pulse cue isn't painted over.
export function ExpenseRow({
  title,
  payerName,
  payerIsViewer = false,
  amount,
  viewerNet = null,
  onClick,
}: ExpenseRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring flex min-h-13 w-full items-center gap-3 rounded-inner px-3 py-2 text-left"
    >
      <Avatar name={payerName} isYou={payerIsViewer} size="md" />
      {/* min-w-0 so the flex item can shrink below its content width and truncate. */}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-body font-semibold text-ink">
          {formatExpenseTitle(title)}
        </span>
        {/* "paid": a lone name next to an amount reads equally as who owes it. */}
        <span className="mt-0.5 flex items-baseline gap-1.5 font-sans text-micro text-dim">
          <span className="min-w-0 truncate">{payerIsViewer ? 'You' : payerName} paid</span>
          {viewerNet !== null && <Amount value={amount} direction="flat" className="shrink-0" />}
        </span>
      </span>
      <span className="shrink-0">
        {viewerNet === null ? (
          <Amount value={amount} className="text-row-amount font-semibold" />
        ) : (
          <Amount
            value={viewerNet}
            direction={viewerNet > 0 ? 'up' : viewerNet < 0 ? 'down' : 'flat'}
            label={captionFor(viewerNet)}
            className="text-row-amount font-semibold"
          />
        )}
      </span>
    </button>
  );
}
