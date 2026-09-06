import { formatCurrency } from '../shared/format';

// `up` is money coming back to you, `down` is money you owe, `flat` is a
// figure that is settled or is not yours either way. Undefined means the
// number carries no direction at all (an expense total, a split share).
export type AmountDirection = 'up' | 'down' | 'flat';

interface AmountProps {
  value: number;
  direction?: AmountDirection;
  // Whether to print the +/− that actually carries the direction. Off by
  // default: most amounts in the app are totals, not balances.
  signed?: boolean;
  // nikita's pattern: a caption directly above the figure reading "you’re
  // owed" / "you owe" / "settled". Removes the sign ambiguity, so direction no
  // longer rides on colour alone and survives for anyone who cannot separate
  // the red from the green.
  label?: string;
  className?: string;
}

const DIRECTION_CLASSES: Record<AmountDirection, string> = {
  up: 'text-accent',
  down: 'text-down',
  flat: 'text-dim',
};

const SIGNS: Record<AmountDirection, string> = { up: '+', down: '−', flat: '' };

// The one place the app's money treatment lives: Geist Mono, the direction
// colour and the sign. Size and weight stay a caller className, since four
// distinct sizes are in use. Mono is tabular by construction, so no
// `tabular-nums` here or at any call site.
export function Amount({ value, direction, signed = false, label, className = '' }: AmountProps) {
  const colour = direction ? DIRECTION_CLASSES[direction] : 'text-ink';
  const sign = signed && direction ? SIGNS[direction] : '';
  const figure = (
    <span className={`font-mono ${colour} ${className}`}>
      {sign}
      {formatCurrency(Math.abs(value))}
    </span>
  );

  if (!label) return figure;

  return (
    <span className="block text-right">
      <span className="block font-sans text-micro text-dim">{label}</span>
      {figure}
    </span>
  );
}
