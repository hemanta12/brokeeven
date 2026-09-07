import { ErrorState } from '../../shared/RouteStates';
import type { SettleMode } from './types';

interface SettleModeChoiceProps {
  mode: SettleMode;
  directCount: number;
  fewestCount: number;
  pending: boolean;
  error?: string;
  onChange: (mode: SettleMode) => void;
}

const OPTIONS: { id: SettleMode; label: string; description: string }[] = [
  {
    id: 'direct',
    label: 'Each balance',
    description: 'Pay back exactly who you owe.'
  },
  {
    id: 'simplified',
    label: 'Fewest payments',
    // The honest trade, and the reason these rows say "pays" and not "owes".
    description: 'Netted, so you may pay someone you did not owe.'
  }
];

// A radio group, not a tablist: this sets how the group behaves rather than
// switching views of the same data.
export function SettleModeChoice({
  mode,
  directCount,
  fewestCount,
  pending,
  error,
  onChange
}: SettleModeChoiceProps) {
  return (
    <fieldset disabled={pending} className="mb-4 min-w-0 border-0 p-0">
      <legend className="mb-1.5 font-sans text-label font-medium text-ink">How this group settles</legend>
      <div className="flex flex-col gap-1.5">
        {OPTIONS.map((option) => {
          const selected = option.id === mode;
          const count = option.id === 'direct' ? directCount : fewestCount;
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-inner border px-3.5 py-3 transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
                selected ? 'border-accent bg-accent-wash' : 'border-transparent bg-sunken'
              } ${pending ? 'opacity-60' : ''}`}
            >
              <input
                type="radio"
                name="settle-mode"
                value={option.id}
                checked={selected}
                onChange={() => onChange(option.id)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-sans text-body font-medium text-ink">{option.label}</span>
                  <span className="shrink-0 font-mono text-micro text-dim">
                    {count} {count === 1 ? 'payment' : 'payments'}
                  </span>
                </span>
                <span className="mt-0.5 block font-sans text-micro text-dim">{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <div className="mt-2">
          <ErrorState message={error} />
        </div>
      )}
    </fieldset>
  );
}
