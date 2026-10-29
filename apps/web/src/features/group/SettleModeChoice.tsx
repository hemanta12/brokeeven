import { useState } from 'react';

import { Button } from '../../components/Button';
import { ErrorState } from '../../shared/RouteStates';
import { SETTLE_MODE_LABEL } from './settleUp';
import type { SettleMode } from './types';

interface SettleModeChoiceProps {
  mode: SettleMode;
  groupName: string;
  directCount: number;
  fewestCount: number;
  // False when Fewest payments would save no payments: only the current mode is shown.
  offersFewest: boolean;
  disabled: boolean;
  error?: string;
  // Resolves once the change has landed for everyone; a rejection keeps the strip open.
  onConfirm: (mode: SettleMode) => Promise<unknown>;
}

const OPTIONS: { id: SettleMode; label: string; description: string }[] = [
  {
    id: 'direct',
    label: SETTLE_MODE_LABEL.direct,
    description: 'Pay back exactly who you owe.'
  },
  {
    id: 'simplified',
    label: SETTLE_MODE_LABEL.simplified,
    // The honest trade, and the reason these rows say "pays" and not "owes".
    description: 'Netted, so you may pay someone you did not owe.'
  }
];

function paymentCount(count: number): string {
  return `${count} ${count === 1 ? 'payment' : 'payments'}`;
}

// A radio group, not a tablist: this sets how the group behaves rather than
// switching views. Tapping the other option only stages it; nothing is written
// until "Change for everyone".
export function SettleModeChoice({
  mode,
  groupName,
  directCount,
  fewestCount,
  offersFewest,
  disabled,
  error,
  onConfirm
}: SettleModeChoiceProps) {
  const [staged, setStaged] = useState<SettleMode | null>(null);
  const [saving, setSaving] = useState(false);
  const target = staged && staged !== mode ? staged : null;
  const options = offersFewest ? OPTIONS : OPTIONS.filter((option) => option.id === mode);

  async function confirm() {
    if (!target) return;
    setSaving(true);
    try {
      await onConfirm(target);
      setStaged(null);
    } catch {
      // The parent surfaces the message through `error`; the strip stays open to retry.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div role="radiogroup" aria-labelledby="paying-back-heading">
      <p id="paying-back-heading" className="font-sans text-body font-medium text-ink">
        Paying back
      </p>
      <p className="mb-2.5 mt-px font-sans text-micro text-dim">How everyone in {groupName} settles up.</p>
      <div className="flex flex-col gap-1.5">
        {options.map((option) => {
          const selected = option.id === mode;
          const isStaged = option.id === target;
          const count = option.id === 'direct' ? directCount : fewestCount;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled || saving || !offersFewest}
              onClick={() => setStaged(selected ? null : option.id)}
              className={`focus-ring flex min-h-14 w-full items-center gap-3 rounded-inner border px-3 py-2.5 text-left transition-colors duration-150 enabled:hover:bg-sunken disabled:cursor-default ${disabled || saving ? 'opacity-60' : ''} ${
                selected
                  ? 'border-accent bg-accent-wash'
                  : isStaged
                    ? 'border-dashed border-accent bg-surface'
                    : 'border-line bg-surface'
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${
                  selected || isStaged ? 'border-accent' : 'border-line-strong'
                }`}
              >
                {selected && <span className="size-2.5 rounded-full bg-accent" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-sans text-label font-semibold text-ink">
                  {option.label}
                  {selected && (
                    <span className="ml-1.5 rounded-full bg-surface px-1.75 py-px align-[1px] text-[11px] font-semibold text-accent">
                      Current
                    </span>
                  )}
                </span>
                <span className="mt-px block font-sans text-micro text-dim">{option.description}</span>
              </span>
              <span className={`shrink-0 font-mono text-micro ${selected ? 'text-accent' : 'text-dim'}`}>
                {paymentCount(count)}
              </span>
            </button>
          );
        })}
      </div>
      {target && (
        <div role="alert" className="inline-in mt-2.5 rounded-inner bg-sunken p-3">
          <p className="mb-2.5 font-sans text-micro leading-[1.45] text-dim">
            <b className="mb-0.5 block text-label font-semibold text-ink">
              Switch everyone to {SETTLE_MODE_LABEL[target]}?
            </b>
            Everyone in {groupName} sees the new plan right away. You can switch back any time.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={confirm} disabled={saving}>
              {saving ? 'Changing…' : 'Change for everyone'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setStaged(null)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-2">
          <ErrorState message={error} />
        </div>
      )}
    </div>
  );
}
