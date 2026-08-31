import { formatCurrency } from '../shared/format';
import { Button } from './Button';

type Direction = 'owe' | 'owed' | 'neutral';

interface BalanceRowProps {
  fromName: string;
  toName: string;
  amount: number;
  direction?: Direction;
  fromIsViewer?: boolean;
  toIsViewer?: boolean;
  onSettle?: () => void;
}

const DIRECTION_CLASSES: Record<Direction, string> = {
  owe: 'text-debt-red',
  owed: 'text-ledger-green',
  // Muted, not full-strength ink: a balance between two other people is
  // context, not your business. At equal weight a five-person group buries
  // your own two rows among everyone else's.
  neutral: 'text-ink-forest/70',
};

// Debt Red and Ledger Green sit at 1.03:1 against each other — near-identical
// luminance, separated only by hue, and ~1.2:1 under deuteranopia. The sign is
// therefore what actually carries the direction; the colour only reinforces it.
// Neutral rows take no sign because the amount isn't the viewer's either way.
const DIRECTION_SIGNS: Record<Direction, string> = {
  owe: '−',
  owed: '+',
  neutral: '',
};

// "Name owes Name" + amount (colored by direction, never color alone — the
// sign already carries the direction) + optional Settle button
// (DESIGN_SYSTEM.md §7). Color is relative to who's asking, so the caller
// (which knows the viewer's identity) resolves `direction`; this stays dumb.
export function BalanceRow({
  fromName,
  toName,
  amount,
  direction = 'neutral',
  fromIsViewer = false,
  toIsViewer = false,
  onSettle,
}: BalanceRowProps) {
  const signed = `${DIRECTION_SIGNS[direction]}${formatCurrency(amount)}`;
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-4 py-3">
      {/* Wraps rather than truncates. Two real names plus "owes" doesn't fit
          beside the amount and the Settle button on a 360px screen, and a
          balance whose second name is cut off ("priyanka owes hem…") is
          unreadable in the one place it has to be exact. The row only grows
          for the pairs that actually need it. */}
      <span
        className={`min-w-0 flex-1 font-sans text-body ${
          direction === 'neutral' ? 'text-ink-forest/70' : 'text-ink-forest'
        }`}
      >
        {fromIsViewer ? 'You owe' : `${fromName} owes`} {toIsViewer ? 'you' : toName}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <span
          className={`font-sans text-row-amount font-medium tabular-nums ${DIRECTION_CLASSES[direction]}`}
        >
          {signed}
        </span>
        {onSettle && (
          <Button variant="secondary" onClick={onSettle} className="px-3.5! text-[0.8125rem]!">
            Settle
          </Button>
        )}
      </span>
    </div>
  );
}
