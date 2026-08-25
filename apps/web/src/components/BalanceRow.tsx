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
  neutral: 'text-ink-forest',
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
  const signed = direction === 'owed' ? `+${formatCurrency(amount)}` : formatCurrency(amount);
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 px-2 py-3">
      <span className="font-sans text-body text-ink-forest">
        {fromIsViewer ? 'You' : fromName} owes {toIsViewer ? 'you' : toName}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <span className={`font-mono text-row-amount tabular-nums ${DIRECTION_CLASSES[direction]}`}>{signed}</span>
        {onSettle && (
          <Button variant="secondary" onClick={onSettle} className="px-3.5! text-[0.8125rem]!">
            Settle
          </Button>
        )}
      </span>
    </div>
  );
}
