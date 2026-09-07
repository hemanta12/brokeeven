import { Amount, type AmountDirection } from './Amount';
import { Button } from './Button';

type Direction = 'owe' | 'owed' | 'neutral';

interface BalanceRowProps {
  fromName: string;
  toName: string;
  amount: number;
  currency: string;
  direction?: Direction;
  fromIsViewer?: boolean;
  toIsViewer?: boolean;
  // `owes` states a debt the expenses created; `pays` states a move the
  // simplified plan suggests. A plan pair often owes each other nothing.
  verb?: 'owes' | 'pays';
  onSettle?: () => void;
}

// `down` and `accent` are near-identical in luminance (~1.2:1 under deuteranopia),
// so the sign carries the direction and colour only reinforces it. Neutral rows
// (a balance between two others) take no sign and a muted colour.
const AMOUNT_DIRECTIONS: Record<Direction, AmountDirection> = {
  owe: 'down',
  owed: 'up',
  neutral: 'flat',
};

// The caller resolves `direction` relative to the viewer; this component stays dumb.
export function BalanceRow({
  fromName,
  toName,
  amount,
  currency,
  direction = 'neutral',
  fromIsViewer = false,
  toIsViewer = false,
  verb = 'owes',
  onSettle,
}: BalanceRowProps) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-4 py-3">
      {/* Wraps, never truncates: a cut-off second name ("priyanka owes hem…") is
          unreadable where the balance has to be exact. */}
      <span
        className={`min-w-0 flex-1 font-sans text-body ${
          direction === 'neutral' ? 'text-dim' : 'text-ink'
        }`}
      >
        {fromIsViewer ? (verb === 'pays' ? 'You pay' : 'You owe') : `${fromName} ${verb}`}{' '}
        {toIsViewer ? 'you' : toName}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <Amount
          value={amount}
          currency={currency}
          direction={AMOUNT_DIRECTIONS[direction]}
          signed
          className="text-row-amount font-semibold"
        />
        {onSettle && (
          <Button variant="secondary" size="sm" onClick={onSettle}>
            Settle
          </Button>
        )}
      </span>
    </div>
  );
}
