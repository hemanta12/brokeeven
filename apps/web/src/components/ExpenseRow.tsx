import { formatExpenseTitle } from '../shared/format';
import { Amount } from './Amount';
import { Avatar } from './Avatar';

interface ExpenseRowProps {
  title: string;
  payerName: string;
  payerIsViewer?: boolean;
  amount: number;
  // What this expense did to the viewer's balance: what they paid on it minus
  // what they owe on it. Null when nobody has said which person they are, in
  // which case there is no "your position" to report and the total is the
  // only figure the row can carry.
  viewerNet?: number | null;
  onClick: () => void;
}

function captionFor(net: number): string {
  if (net > 0) return 'you’re owed';
  if (net < 0) return 'you owe';
  return 'not yours';
}

// Card contents for one expense (DESIGN_SYSTEM.md §7). Two figures, not one:
// the total answers "what did this cost", which is the only question the
// expense list can answer, and the viewer's own position answers "did this
// cost me or earn me", which is the question you actually have while scrolling.
// Collapsing to just the position (as sketch 013 drew it) would leave the
// group's real spend nowhere on the screen and make the visible column stop
// summing to the group total. The caption above the position is what stops
// direction riding on colour alone. The card surface, hover and press live on
// the wrapping <li> (see .entry-card) so the .row-pulse cue isn't painted over.
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
      {/* Everyone has a face on every screen (sketch 013). The payer's is the
          one that matters on this row: it answers "whose is this" before the
          subtitle is read. */}
      <Avatar name={payerName} isYou={payerIsViewer} size="md" />
      {/* min-w-0 lets the truncation below actually engage: without it the
          flex item refuses to shrink past its content's intrinsic width. */}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-body font-semibold text-ink">
          {formatExpenseTitle(title)}
        </span>
        {/* "paid" carries real meaning here: a lone name next to an amount
            reads equally as who owes it. */}
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
