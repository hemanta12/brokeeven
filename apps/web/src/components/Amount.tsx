import { formatCurrency } from '../shared/format';

// `up` = owed to you, `down` = you owe, `flat` = settled or not yours. Undefined
// = no direction (an expense total, a split share).
export type AmountDirection = 'up' | 'down' | 'flat';

interface AmountProps {
  value: number;
  direction?: AmountDirection;
  // Print the +/− that carries direction. Off by default (most amounts are totals).
  signed?: boolean;
  // Caption above the figure ("you're owed" / "you owe" / "settled") so direction
  // does not ride on colour alone.
  label?: string;
  // ISO 4217 code of the enclosing group; omitted where there is no group
  // (defaults to USD).
  currency?: string;
  className?: string;
}

const DIRECTION_CLASSES: Record<AmountDirection, string> = {
  up: 'text-accent',
  down: 'text-down',
  flat: 'text-dim',
};

const SIGNS: Record<AmountDirection, string> = { up: '+', down: '−', flat: '' };

// The single place money is rendered: mono font, direction colour, sign (size
// and weight are a caller className). Mono is already tabular — no `tabular-nums`
// anywhere.
export function Amount({ value, direction, signed = false, label, currency, className = '' }: AmountProps) {
  const colour = direction ? DIRECTION_CLASSES[direction] : 'text-ink';
  const sign = signed && direction ? SIGNS[direction] : '';
  const figure = (
    <span className={`font-mono ${colour} ${className}`}>
      {sign}
      {formatCurrency(Math.abs(value), currency)}
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
